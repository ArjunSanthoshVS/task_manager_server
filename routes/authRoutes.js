const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

/* GET home page. */
router.post('/signup', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

module.exports = router;
