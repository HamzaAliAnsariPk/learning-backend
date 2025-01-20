  import express from "express";
  import mongoose from "mongoose";
  import dotenv from "dotenv";
  import bcrypt from "bcryptjs";
  import jwt from "jsonwebtoken";
  import authenticateToken from "./auth.middleware.js";
  
  // Load environment variables from .env file
  dotenv.config();

  const app = express();
  app.use(express.json());
  const PORT = 5000;

  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
      console.log("DB connected");
    })
    .catch((error) => {
      console.error("Error connecting to DB:", error);
    });

  // Create User schema and model
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fatherName: { type: String, required: true },
    age: { type: Number, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    city: { type: String, required: false },
  });

  const User = mongoose.model("User", userSchema);

  // shema for cars

  const motorsSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    Model: { type: String, required: true },
    Year: { type: Number, reqiured: true },
    Colour: { type: String, reqiured: false },
  });

  const Motors = mongoose.model("motor", motorsSchema);

  // Create a new user
  app.post("/createUser", async (req, res) => {
    try {
      const { username, email, password, fatherName, city, age } = req.body;
      const checkUser = await User.findOne({ email });
      if (checkUser) {
        return res.status(400).json({ msg: "User already exists" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = new User({
        username,
        email,
        password: hashedPassword,
        fatherName,
        city,
        age,
      });
      await user.save();
      res.status(201).send(user);
    } catch (error) {
      res.status(400).send({ msg: error.message || "Error creating user" });
    }
  });

  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: "Invalid Credentials" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid Credentials" });
      }
      user.password = "";
      const payload = { user };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  });

  app.post("/refreshToken", (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ msg: "No token provided" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ msg: "Invalid token" });
      res.json({ user });
    });
  });

  // Create a new MOTORS
  app.post("/createMotors", async (req, res) => {
    try {
      const motors = new Motors(req.body);
      console.log("Request Body", req.body);
      await motors.save();
      res.status(201).send(motors);
    } catch (error) {
      res.status(400).send(error);
    }
  });

  // Read all users
  // app.use(authenticateToken)
  app.get("/users", authenticateToken, async (req, res) => {
    console.log(req.user);
    try {
      const users = await User.find({ email: req.user.email });
      res.status(200).send(users);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  // Read a user by ID
  app.get("/users/:id", async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).send(user);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  // Update a user by ID
  app.patch("/users/:id", async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).send(user);
    } catch (error) {
      res.status(400).send(error);
    }
  });

  // Delete a user by ID
  app.delete("/users/:id", async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).send(user);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
  });
