const express = require("express");
const { validateSignUpData } = require("../utils/validation");
const authRouter = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");

const isProd = process.env.NODE_ENV === "production";

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",

    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

authRouter.post("/signup", async (req, res) => {
  try {
    validateSignUpData(req);
    const { firstName, lastName, emailId, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    const savedUser = await user.save();
    const token = await savedUser.getJWT();
    setAuthCookie(res, token);

    res.json({ message: "User Added successfully", data: savedUser });
  } catch (err) {
    res.status(400).send("Error saving the user: " + err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (typeof emailId !== "string" || typeof password !== "string") {
      throw new Error("Invalid Credentials");
    }

    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid Credentials");
    }
    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      const token = await user.getJWT();
      setAuthCookie(res, token);
      res.send(user);
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

authRouter.post("/logout", async (req, res) => {
  res
    .cookie("token", null, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      expires: new Date(Date.now()),
    })
    .send("Logout Successful!!!");
});

module.exports = authRouter;
