const authController = require('../controllers/authController');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../models/user'); // Mock the User model
jest.mock('bcrypt'); // Mock bcrypt
jest.mock('jsonwebtoken'); // Mock jsonwebtoken

describe("Auth Controller", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("should return 400 if validation fails", async () => {
            req.body = { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" };

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
        });

        it("should return 400 if email is already in use", async () => {
            req.body = {
                firstName: "John",
                lastName: "Doe",
                email: "test@example.com",
                password: "password123",
                confirmPassword: "password123"
            };

            User.findOne.mockResolvedValue({ email: "test@example.com" });

            await authController.register(req, res);

            expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Email is already in use" });
        });

        it("should return 201 if registration is successful", async () => {
            req.body = {
                firstName: "John",
                lastName: "Doe",
                email: "test@example.com",
                password: "password123",
                confirmPassword: "password123"
            };

            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue("hashedpassword");
            User.prototype.save = jest.fn().mockResolvedValue();

            await authController.register(req, res);

            expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
            expect(User.prototype.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: "User registered successfully" });
        });

        it("should return 500 if an error occurs", async () => {
            req.body = {
                firstName: "John",
                lastName: "Doe",
                email: "test@example.com",
                password: "password123",
                confirmPassword: "password123"
            };

            User.findOne.mockRejectedValue(new Error("Database Error"));

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
        });
    });

    describe("login", () => {
        it("should return 400 if validation fails", async () => {
            req.body = { email: "", password: "" };

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
        });

        it("should return 404 if user is not found", async () => {
            req.body = { email: "notfound@example.com", password: "password123" };

            User.findOne.mockResolvedValue(null);

            await authController.login(req, res);

            expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 400 if password does not match", async () => {
            req.body = { email: "test@example.com", password: "wrongpassword" };

            User.findOne.mockResolvedValue({ email: "test@example.com", password: "hashedpassword" });
            bcrypt.compare.mockResolvedValue(false);

            await authController.login(req, res);

            expect(bcrypt.compare).toHaveBeenCalledWith("wrongpassword", "hashedpassword");
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
        });

        it("should return 200 if login is successful", async () => {
            req.body = { email: "test@example.com", password: "password123" };

            User.findOne.mockResolvedValue({
                _id: "123",
                email: "test@example.com",
                password: "hashedpassword",
                firstName: "John",
                lastName: "Doe"
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue("testtoken");

            await authController.login(req, res);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: "123", email: "test@example.com" },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Login successful",
                token: "testtoken",
                user: {
                    id: "123",
                    email: "test@example.com",
                    name: "John Doe"
                }
            });
        });

        it("should return 500 if an error occurs", async () => {
            req.body = { email: "test@example.com", password: "password123" };

            User.findOne.mockRejectedValue(new Error("Database Error"));

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Database Error" });
        });
    });
});
