import { Request, Response } from 'express';
import { chapaService, SUBSCRIPTION_PLANS } from '../services/chapa.service';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

/**
 * Get all available subscription plans
 */
export const getPlans = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: SUBSCRIPTION_PLANS,
      currency: 'ETB',
      supportedGateways: ['Telebirr', 'CBEBirr', 'Awash Bank', 'Bank of Abyssinia', 'Visa/Mastercard']
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Get user's active subscription status and transaction history
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    let user = null;
    let transactions: any[] = [];

    if (userId) {
      user = await User.findById(userId);
      transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);
    }

    const currentTier = user?.subscriptionTier || 'free';
    const planDetails = SUBSCRIPTION_PLANS.find(p => p.id === currentTier) || SUBSCRIPTION_PLANS[0];

    res.status(200).json({
      success: true,
      data: {
        tier: currentTier,
        status: user?.subscriptionStatus || 'active',
        expiresAt: user?.subscriptionExpiresAt || null,
        plan: planDetails,
        transactions
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Initialize a Chapa payment transaction
 */
export const initializeChapaPayment = async (req: Request, res: Response) => {
  try {
    const {
      tier = 'pro',
      billingCycle = 'monthly',
      customerName,
      customerEmail,
      customerPhone,
      currency = 'ETB'
    } = req.body;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === tier);
    if (!plan || plan.id === 'free') {
      return res.status(400).json({ success: false, error: 'Please choose either Pro or Enterprise plan.' });
    }

    // Determine amount
    const amount = billingCycle === 'annual'
      ? (plan.priceETBAnnual || plan.priceETB * 10)
      : plan.priceETB;

    const user = (req as any).user;
    const name = customerName || user?.name || 'Jane Smith';
    let email = customerEmail || user?.email || 'customer@sentrix.com';
    if (email.endsWith('.local') || !email.includes('@')) {
      email = 'customer@sentrix.com';
    }
    const phone = customerPhone || '0911234567';

    // Unique transaction reference (Chapa Global allows max 20 chars)
    const tx_ref = `stx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    // Create pending transaction in MongoDB
    const transaction = await Transaction.create({
      userId: user?._id,
      tx_ref,
      amount,
      currency,
      tier,
      billingCycle,
      status: 'pending',
      customerName: name,
      customerEmail: email,
      customerPhone: phone
    });

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    // Chapa Global requires return_url to start with https://
    let returnUrl = process.env.CHAPA_RETURN_URL;
    if (!returnUrl) {
      const origin = req.headers.origin || 'http://localhost:5173';
      const httpsOrigin = origin.startsWith('http://') ? origin.replace('http://', 'https://') : origin;
      returnUrl = `${httpsOrigin}/dashboard/billing?status=verify&tx_ref=${tx_ref}`;
    } else {
      returnUrl = `${returnUrl}?status=verify&tx_ref=${tx_ref}`;
    }
    const callbackUrl = process.env.CHAPA_WEBHOOK_URL?.startsWith('https://') ? process.env.CHAPA_WEBHOOK_URL : undefined;

    // Initialize with Chapa service
    const chapaResult = await chapaService.initializePayment({
      amount,
      currency,
      email,
      firstName,
      lastName,
      phoneNumber: phone,
      tx_ref,
      returnUrl,
      callbackUrl,
      customizationTitle: `Sentrix ${plan.name}`,
      customizationDescription: `${billingCycle === 'annual' ? 'Annual' : 'Monthly'} access to Sentrix Cybersecurity Platform`
    });

    // Update transaction with checkout URL
    transaction.checkoutUrl = chapaResult.checkoutUrl;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Chapa transaction initialized',
      data: {
        tx_ref,
        checkoutUrl: chapaResult.checkoutUrl,
        amount,
        currency,
        tier,
        billingCycle,
        isSimulated: chapaResult.isSimulated
      }
    });
  } catch (err: any) {
    console.error('[Payment] Error initializing Chapa:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment initialization failed' });
  }
};

/**
 * Verify payment with Chapa and upgrade user tier
 */
export const verifyChapaPayment = async (req: Request, res: Response) => {
  try {
    const tx_ref_param = req.params.tx_ref;
    const tx_ref = (Array.isArray(tx_ref_param) ? tx_ref_param[0] : tx_ref_param) as string;
    if (!tx_ref) {
      return res.status(400).json({ success: false, error: 'Transaction reference is required' });
    }

    // Verify with Chapa
    const verifyResult = await chapaService.verifyPayment(tx_ref);

    // Find transaction
    let transaction = await Transaction.findOne({ tx_ref });
    if (!transaction) {
      // Create mock transaction record if not found (e.g. direct sandbox test)
      transaction = await Transaction.create({
        tx_ref,
        amount: verifyResult.amount || 2500,
        currency: verifyResult.currency || 'ETB',
        tier: 'pro',
        billingCycle: 'monthly',
        status: 'success',
        customerName: 'Jane Smith',
        customerEmail: 'jane@sentrix.local'
      });
    }

    if (verifyResult.success && verifyResult.status === 'success') {
      transaction.status = 'success';
      transaction.paymentMethod = verifyResult.paymentMethod || 'telebirr';
      transaction.chapaReference = verifyResult.reference || `REF-${Date.now()}`;
      transaction.verifiedAt = new Date();
      await transaction.save();

      // Calculate expiration date
      const daysToAdd = transaction.billingCycle === 'annual' ? 365 : 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysToAdd);

      // Upgrade logged-in user or transaction user
      const targetUserId = (req as any).user?._id || transaction.userId;
      if (targetUserId) {
        await User.findByIdAndUpdate(targetUserId, {
          subscriptionTier: transaction.tier,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expiresAt,
          chapaCustomerRef: transaction.chapaReference
        });
      }

      return res.status(200).json({
        success: true,
        message: `Payment verified! You are now upgraded to Sentrix ${transaction.tier.toUpperCase()}.`,
        data: {
          tier: transaction.tier,
          status: 'active',
          expiresAt,
          amount: transaction.amount,
          currency: transaction.currency,
          paymentMethod: transaction.paymentMethod,
          tx_ref
        }
      });
    } else {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({
        success: false,
        error: 'Chapa verification indicated the transaction failed or was canceled.'
      });
    }
  } catch (err: any) {
    console.error('[Payment] Error verifying Chapa:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment verification failed' });
  }
};

/**
 * Chapa Webhook receiver
 */
export const handleChapaWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const tx_ref = payload?.tx_ref;

    if (tx_ref) {
      const transaction = await Transaction.findOne({ tx_ref });
      if (transaction && payload.status === 'success') {
        transaction.status = 'success';
        transaction.paymentMethod = payload.method || 'telebirr';
        transaction.chapaReference = payload.reference;
        transaction.verifiedAt = new Date();
        await transaction.save();

        if (transaction.userId) {
          const daysToAdd = transaction.billingCycle === 'annual' ? 365 : 30;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + daysToAdd);

          await User.findByIdAndUpdate(transaction.userId, {
            subscriptionTier: transaction.tier,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: expiresAt
          });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Cancel or downgrade subscription
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription downgraded to Free Community tier.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
