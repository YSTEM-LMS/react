/**
 * User Routes
 * 
 * API endpoints for user management and account operations.
 * Handles user registration, profile updates, password management,
 * and parent-child relationships.
 * 
 * Main Features:
 * - User registration with email validation
 * - Parent account management
 * - Password reset functionality
 * - Profile information retrieval and updates
 * - Student progress tracking
 */

const express = require("express");
const passport = require("passport");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { check, validationResult } = require("express-validator");
const users = require("../models/users");
const Activities = require("../models/activities");
const { selectActivities } = require("../utils/activities");
const {
  ChangePasswordTemplateForUser,
} = require("../template/changePasswordTemplate");
const { sendMail } = require("../utils/nodemailer");
const { validator } = require("../utils/middleware");
const { getAvatarUrl, getBlobServiceClient, AVATAR_CONTAINER } = require("../utils/avatars");
const { MongoClient } = require("mongodb");
const config = require("config");

const mongoose = require("mongoose");

// Cache database client to prevent repeated connections
let cachedClient = null;

/**
 * Gets database client, creating connection if needed
 * @returns {MongoDB.Db} Database instance
 */
async function getDb() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }
  if (!cachedClient) {
    cachedClient = new MongoClient(config.get("mongoURI"));
    await cachedClient.connect();
  }
  return cachedClient.db("ystem");
}

/**
 * GET /user/children
 * 
 * Retrieves all children accounts associated with a parent user.
 * Returns username and time played for each child.
 * 
 * @access JWT authenticated parents only
 */
router.get("/children", passport.authenticate("jwt"), async (req, res) => {
  try {
    const { role, username } = req.user;
    if (role !== "parent") {
      res
        .status(400)
        .json("You must have a parent account to access your children");
    } else {
      //Find all children for the parent user and retrieve only the username and timePlayed field
      const childrenArray = await users
        .find({ parentUsername: username })
        .select(["timePlayed", "username", "firstName", "lastName"]);
      res.status(200).json(childrenArray);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

// @route   POST /user/
// @desc    POST Signup the requested user with the provided credentials
// @access  Public
router.post(
  "/",
  // [
  //   check("username", "Username is required").not().isEmpty(),
  //   check("password", "Password is required").not().isEmpty(),
  //   check("first", "First name is required").not().isEmpty(),
  //   check("last", "Last name is required").not().isEmpty(),
  //   check("email", "Email address is required").not().isEmpty(),
  //   check("role", "Role is required").not().isEmpty(),
  // ],
  async (req, res) => {
    //Field validations for checks
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, first, last, email, role, students, zipcode, gender, gradeLevel, occupation } =
      req.query;

    //Error catching when using mongoose functions like Users.findOne()
    try {
      const sha384 = crypto.createHash("sha384");
      const hashedPassword = sha384.update(password).digest("hex");
      //Error checking to see if a user with the same username exists
      const user = await users.findOne({ username });
      if (user) {
        return res
          .status(400)
          .json("This username has been taken. Please choose another.");
      }

      //Set the account created date for the new user
      const currDate = new Date();

      //Switch statement for functionality depending on role
      if (role === "parent") {
        let studentsArray = students ? JSON.parse(students) : [];
        //Check if students array is present and is populated
        if (studentsArray && studentsArray.length > 0) {
          //Ensure student usernames aren't already in the database
          for (i = 0; i < studentsArray.length; i++) {
            const studentUser = await users.findOne({
              username: studentsArray[i].username,
            });
            if (studentUser) {
              return res
                .status(400)
                .json("This username has been taken. Please choose another.");
            }
          }

          //Insert the students into the database one at a time
          await Promise.all(
            studentsArray.map(async (student) => {
              const sha384 = crypto.createHash("sha384");
              const newStudent = new users({
                username: student.username,
                password: sha384.update(student.password).digest("hex"),
                firstName: student.first,
                lastName: student.last,
                email: student.email,
                parentUsername: username,
                role: "student",
                accountCreatedAt: currDate.toLocaleString(),
                timePlayed: 0,
                zipcode: student.zipcode || null,
                gender: student.gender || null,
                gradeLevel: student.gradeLevel || null,
              });
              await newStudent.save(async function (err, user) {
                if(err) {
                  console.error('Error saving student: ', err);
                }
                else {
                  console.log(user._id);
                  const newActivities = await selectActivities();
                  const activitiesEntry = new Activities({
                    userId: user.id,
                    activities: newActivities,
                    completedDates: [],
                  });
                  await activitiesEntry.save(function (err, activity) {
                    console.error('Error creating activities for student: ', err);
                  });
                }
              });
            }),
          );
        }
      }
      const mainUser = new users({
        username,
        password: hashedPassword,
        firstName: first,
        lastName: last,
        email,
        role,
        accountCreatedAt: currDate.toLocaleString(),
        zipcode: zipcode || null,
        gender: gender || null,
        gradeLevel: gradeLevel || null,
        occupation: occupation || null,
      });
      await mainUser.save();

      // A student signing up directly (not via a parent's students[] list,
      // which already seeds activities above) previously got no Activities
      // document at all — the Activities modal would then receive
      // activities: null from the API and silently fail to render (the
      // fetch throws inside the modal's try/catch, loading never clears).
      if (role === "student") {
        const newActivities = await selectActivities();
        await new Activities({
          userId: mainUser._id,
          activities: newActivities,
          completedDates: [],
        }).save();
      }

      res.status(200).json("Added users");
    } catch (error) {
      console.error(error.message);
      res.status(500).json("Server error");
    }
  }
);

// @route   POST /user/children
// @desc    POST Signup the student with the parent account
// @access  Public with jwt Authentication
router.post(
  "/children",
  [
    check("username", "Username is required").not().isEmpty(),
    check("password", "Password is required").not().isEmpty(),
    check("first", "First name is required").not().isEmpty(),
    check("email", "email is required").not().isEmpty(),
    check("last", "Last name is required").not().isEmpty(),
  ],
  passport.authenticate("jwt"),
  async (req, res) => {
    //Field validations for checks
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, first, last, email, birthday, gender, gradeLevel } = req.query;

    try {
      const sha384 = crypto.createHash("sha384");
      const hashedPassword = sha384.update(password).digest("hex");

      const user = await users.findOne({ username });
      if (user) {
        return res
          .status(400)
          .json("This username has been taken. Please choose another.");
      }

      //Set the account created date for the new user
      const currDate = new Date();

      const newStudent = new users({
        username,
        password: hashedPassword,
        firstName: first,
        lastName: last,
        email: email,
        parentUsername: req.user.username,
        role: "student",
        accountCreatedAt: currDate.toLocaleString(),
        birthday: birthday || null,
        gender: gender || null,
        gradeLevel: gradeLevel || null,
        recordingList: [],
      });
      const savedStudent = await newStudent.save();

      //Seed default activities for the new student, best effort so it never blocks account creation
      try {
        const newActivities = await selectActivities();
        const activitiesEntry = new Activities({
          userId: savedStudent.id,
          activities: newActivities,
          completedDates: [],
        });
        await activitiesEntry.save();
      } catch (activitiesError) {
        console.error("Error creating activities for student: ", activitiesError.message);
      }

      return res.status(200).json("Added student");
    } catch (error) {
      console.error(error.message);
      res.status(500).json("Server error");
    }
  }
);
// @route POST /user/sendMail
// @desc sending the mail based on username and email
router.post("/sendMail", async (req, res) => {
  const { username, email } = req?.query;
  let data = await getEmail(username, email);
  if (data) {
    const passwordChange = await ChangePasswordTemplateForUser(username, email);
    await sendMail(passwordChange);
    res.status(200).send("Mail Sent Successfully");
  } else {
    res.status(400).send("Invalid request payload");
  }
});
// async function to check that requested username with that particular email is exists or not.
const getEmail = async (username, email) => {
  const data = await users.findOne({ username: username, email: email });
  return data;
};

// @route POST /user/resetPassword/:token
// @desc for reseting the password.

router.post("/resetPassword", validator, async (req, res) => {
  try {
    const { email, username } = req?.user;
    const getEmailId = await getEmail(username, email);
    if (!getEmailId) {
      return res.status(400).send("Invalid data");
    }
    const password = req?.query;
    const sha384 = crypto.createHash("sha384");
    const hashedPassword = sha384?.update(password?.password)?.digest("hex");
    const updatedUser = await updatePassword({
      username,
      password: hashedPassword,
      email,
    });
    if (updatedUser) {
      return res.status(200).send("Changed successfully");
    } else {
      return res.status(400).send("Invalid data");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
});

const updatePassword = async (body) => {
  const result = await users.findOneAndUpdate(
    { username: body.username, email: body.email },
    { password: body.password },
    { new: true }
  );
  return result;
};

// @route GET /user/mentorless/:keyword
// @desc for getting the mentorless students whose username matches keyword.
// @access Private with JWT Authentication
router.get("/mentorless", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const keyword = req.query.keyword || ""; // get the keyword
  try {
    const db = await getDb();
    const users = db.collection("users");

    const userList = await users.find({
      role: 'student',// get student
      username: { $regex: keyword, $options: 'i' }, // case-insensitive match for username
      mentorshipUsername: "" // students who don't have mentors
    }).toArray();;
    res.json(userList.map(user => user.username)); // return a list of the usernames
  } catch (err) {
    res.status(500).json({ error: err.message }); // error
  }
});

// @route PUT /user/updateMentorship/:mentorship
// @desc if user is student, update its mentor username to the mentorship= query
// @desc if user is mentor, update its student username to the mentorship= query
// @access  Public with jwt Authentication
router.put(
  "/updateMentorship",
  async (req, res, next) => {
    passport.authenticate(
      "jwt",
      { session: false },
      async (err, user, info) => {
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        next();
      }
    )(req, res, next); // authenticate jwt
  },
  async (req, res) => {
    // get the student/mentor username
    const mentorship = req.query.mentorship;
    if (!mentorship) {
      // mentorship query is required
      return res
        .status(400)
        .json({ message: "Missing mentorship username in query" });
    }

    try {
      // get db & collection
      const db = await getDb();
      const users = db.collection("users");
      // update user's mentor relationship
      const result = await users.updateOne(
        { username: req.user.username },
        { $set: { mentorshipUsername: mentorship } }
      );
      // update mentor relationshp both ways
      const result2 = await users.updateOne(
        { username: mentorship },
        { $set: { mentorshipUsername: req.user.username } }
      );

      // if mentorship field is not modified
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "User not found or already has that mentorshipUsername, username: " + req.user.username });
      }

      res.json({ message: "Mentorship updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message }); // error
    }
  }
);

// @route GET /user/getMentorship
// @desc if user is a student, responds with its mentor's object {username, firstName, lastName}
// @desc if user is a mentor, responds with its student's object {username, firstName, lastName}
// @access  Public with jwt Authentication
router.get(
  "/getMentorship",
  async (req, res, next) => {
    passport.authenticate(
      "jwt",
      { session: false },
      async (err, user, info) => {
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        next();
      }
    )(req, res, next); // authenticate jwt
  },
  async (req, res) => {
    try {
      const db = await getDb();
      const users = db.collection("users");
      const mentorshipUsername = req.user.mentorshipUsername;
      // error if it does not have mentorship established
      if (!mentorshipUsername) {
        return res.status(404).json({ message: "Mentorship not set" });
      }

      // now find the mentor/student by that username
      const mentorUser = await users.findOne(
        { username: mentorshipUsername },
        { projection: { _id: 0, username: 1, firstName: 1, lastName: 1 } }
      );
      if (!mentorUser) {
        return res.status(404).json({ message: "Mentorship user not found" });
      }
      res.json(mentorUser); // { username, firstName, lastName }
    } catch (error) {
      console.error("Error in getMentorship:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/getStudent", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const keyword = req.query.keyword || "";

  try {
    const db = await getDb();
    const users = db.collection("users");

    const userList = await users
      .find({
        role: "student", // get student
        username: { $regex: keyword, $options: "i" }, // case-insensitive match for username
      })
      .toArray();

    res.json(userList.map((user) => user.username)); // return a list of the usernames
  } catch (err) {
    res.status(500).json({ error: err.message }); // error
  }
});

// verify role

router.post("/verifyRole", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token?.login) {
      return res.status(400).json({ error: "Missing token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token.login, config.get("indexKey"));
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await users
      .findOne({ username: decoded.username })
      .select("role");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (decoded.role === user.role) {
      return res.json({ verified: true });
    } else {
      return res.status(403).json({ error: "Role mismatch", verified: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/getUser", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const username = req.query.username || "";
  try {
    const user = await users.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(user);
  } catch (err) {
    return res.status(401).json({ error: err });
  }
});

// @route   PUT /user/updateHighScore
// @desc    Update the user's highest streak or dash score if they beat their record
// @access  Public with jwt Authentication
router.put("/updateHighScore", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { streakScore, dashScore } = req.body;
    const db = await getDb();
    const usersCollection = db.collection("users");

    const updateFields = {};
    
    // Mongoose $max operator ensures it ONLY updates if the new score is higher than the old one!
    if (streakScore !== undefined) updateFields.highestStreak = parseInt(streakScore);
    if (dashScore !== undefined) updateFields.highestDashScore = parseInt(dashScore);

    if (Object.keys(updateFields).length === 0) return res.status(400).json("No scores provided");

    const result = await usersCollection.updateOne(
      { username: req.user.username },
      { $max: updateFields } 
    );

    res.status(200).json({ message: "High scores checked and updated successfully" });
  } catch (error) {
    console.error("Error updating high score:", error);
    res.status(500).json("Server error");
  }
});

/**
 * PUT /user/profile
 * Allows the authenticated user to update their own demographic and
 * leaderboard-filter fields (zipcode, gender, gradeLevel, country, state,
 * school). country/state/school previously had no write path anywhere —
 * they existed on the schema and were filterable on /leaderboard, but
 * nothing let a student actually set them.
 */
router.put("/profile", passport.authenticate("jwt"), async (req, res) => {
  try {
    const { zipcode, gender, gradeLevel, country, state, school } = req.body;
    const allowed = ["M", "F", "Other", null];

    if (gender !== undefined && !allowed.includes(gender))
      return res.status(400).json({ error: "gender must be M, F, Other, or null" });

    const updates = {};
    if (zipcode    !== undefined) updates.zipcode    = zipcode    || null;
    if (gender     !== undefined) updates.gender     = gender     || null;
    if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel || null;
    if (country    !== undefined) updates.country    = country    || null;
    if (state      !== undefined) updates.state      = state      || null;
    if (school     !== undefined) updates.school     = school     || null;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No updatable fields provided" });

    await users.updateOne({ username: req.user.username }, { $set: updates });
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("PUT /user/profile:", err.message);
    res.status(500).json("Server error");
  }
});

// Avatar uploads are held in memory (not on disk) then streamed straight to
// Azure Blob Storage (avatars container — see utils/avatars.js).
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or WEBP images are allowed"));
    }
    cb(null, true);
  },
});

/**
 * GET /user/avatar
 *
 * Returns a presigned URL for the authenticated user's own avatar, or
 * avatarUrl: null if none has been uploaded yet. Self-only, same pattern
 * as POST below — no :username param, always operates on req.user.
 *
 * @access JWT authenticated users
 */
router.get("/avatar", passport.authenticate("jwt"), async (req, res) => {
  try {
    const user = await users.findOne({ username: req.user.username }, { avatarKey: 1 });
    res.json({ avatarUrl: getAvatarUrl(user?.avatarKey) });
  } catch (err) {
    console.error("GET /user/avatar:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /user/avatar
 *
 * Uploads a profile avatar image for the authenticated user, storing it in
 * Azure Blob Storage under a per-user blob name. Only ever operates on
 * req.user's own record (same pattern as PUT /profile) — there is no
 * :username param, so a student can never upload an avatar for another
 * account.
 *
 * @access JWT authenticated users
 */
router.post(
  "/avatar",
  passport.authenticate("jwt"),
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "avatar file is required" });
      }

      const extension = req.file.mimetype.split("/")[1];
      const avatarKey = `${req.user.username}/${uuidv4()}.${extension}`;

      const { client } = getBlobServiceClient();
      const blockBlobClient = client
        .getContainerClient(AVATAR_CONTAINER)
        .getBlockBlobClient(avatarKey);
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });

      await users.updateOne(
        { username: req.user.username },
        { $set: { avatarKey } }
      );

      res.status(200).json({ message: "Avatar uploaded", avatarKey, avatarUrl: getAvatarUrl(avatarKey) });
    } catch (err) {
      console.error("POST /user/avatar:", err.message);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
