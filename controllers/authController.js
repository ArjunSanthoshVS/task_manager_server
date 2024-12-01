require('dotenv').config()
const bcrypt = require("bcrypt");
const Joi = require("joi");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
};

module.exports = {
    register: async (req, res) => {
        const schema = Joi.object({
            firstName: Joi.string().min(3).max(30).required(),
            lastName: Joi.string().min(1).max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(8).required(),
            confirmPassword: Joi.string().min(8).required()
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { firstName, lastName, email, password } = req.body;

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = new User({ firstName, lastName, email, password: hashedPassword });
            await user.save();

            return res.status(201).json({ message: 'User registered successfully' });
        } catch (err) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    },


    login: async (req, res) => {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.googleId) {
                return res.status(400).json({ message: "Please login with Google or Creaete a new account..!" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Invalid credentials" });
            }

            const token = jwt.sign(
                { id: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(200).json({
                message: "Login successful",
                token,
                user: { id: user._id, email: user.email, name: `${user.firstName} ${user.lastName}` },
            });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    },


    googleLogin: async (req, res) => {
        try {
            const { googleToken } = req.body;
            const payload = await verifyGoogleToken(googleToken);

            if (!payload || !payload.email_verified) {
                return res.status(400).json({ message: 'Invalid Google Token or Email not verified' });
            }

            const { email, given_name, family_name, sub } = payload;

            let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });

            if (!user) {
                user = new User({
                    firstName: given_name,
                    lastName: family_name,
                    email,
                    googleId: sub,
                });

                await user.save();
            }

            const token = jwt.sign(
                { id: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(200).json({
                message: "Google Login successful",
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                },
            });
        } catch (err) {
            console.error(err);
            return res.status(400).json({ message: 'Invalid Google Token' });
        }
    },
};
