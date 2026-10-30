import express from "express";
import {
  initiateGithubAuth,
  githubCallback,
  fail,
} from "../controllers/github-auth.controller.js";

const route = express.Router();

// Initiation endpoints: support /, /github, and /auth/github
route.get("/", initiateGithubAuth);
route.get("/github", initiateGithubAuth);
route.get("/auth/github", initiateGithubAuth);

// Callback endpoints: support /callback, /github/callback, and /auth/github/callback
route.get("/callback", githubCallback);
route.get("/github/callback", githubCallback);
route.get("/auth/github/callback", githubCallback);

// Failure endpoints
route.get("/fail", fail);
route.get("/auth/github/fail", fail);

export default route;

