import { Router } from 'express';
import {
  getPlans,
  getCurrentSubscription,
  initializeChapaPayment,
  verifyChapaPayment,
  handleChapaWebhook,
  cancelSubscription
} from '../controllers/payment.controller';

const router = Router();

// Public plan catalog
router.get('/plans', getPlans);

// Subscription details
router.get('/subscription', getCurrentSubscription);

// Chapa checkout initialization
router.post('/chapa/initialize', initializeChapaPayment);

// Chapa verification & callback
router.get('/chapa/verify/:tx_ref', verifyChapaPayment);

// Chapa server-to-server webhook
router.post('/chapa/webhook', handleChapaWebhook);

// Cancel / downgrade
router.post('/subscription/cancel', cancelSubscription);

export default router;
