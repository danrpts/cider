// Schemas
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    index: {
      unique: true,
      sparse: true
    }
  },
  created: {
    type: Date,
    default: Date.now
  }
});
const AnswerSchema = new Schema({
  question: {
    type: Schema.ObjectId,
    ref: "Question",
    required: true,
    index: true
  },
  author: {
    type: Schema.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["response", "option"]
  },
  accepted: Boolean,
  created: {
    type: Date,
    default: Date.now
  },
  votes: {
    sum: {
      type: Number,
      default: 0
    },
    up: [
      {
        type: Schema.ObjectId,
        ref: "User"
      }
    ],
    down: [
      {
        type: Schema.ObjectId,
        ref: "User"
      }
    ]
  }
});
const QuestionSchema = new Schema({
  author: {
    type: Schema.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  details: String,
  type: {
    type: String,
    required: true,
    enum: ["discussion", "poll"]
  },
  accepted: {
    type: Schema.ObjectId,
    ref: "Answer"
  },
  created: {
    type: Date,
    default: Date.now
  },
  answers: [
    {
      type: Schema.ObjectId,
      ref: "Answer"
    }
  ],
  bumps: {
    sum: {
      type: Number,
      default: 0
    },
    up: [
      {
        type: Schema.ObjectId,
        ref: "User"
      }
    ],
    down: [
      {
        type: Schema.ObjectId,
        ref: "User"
      }
    ]
  },
  stars: [
    {
      type: Schema.ObjectId,
      ref: "User"
    }
  ]
});
const UserModel = mongoose.model("User", UserSchema);
const AnswerModel = mongoose.model("Answer", AnswerSchema);
const QuestionModel = mongoose.model("Question", QuestionSchema);

// Object Database
const uri = "mongodb://127.0.0.1:27017";
const dbServer = mongoose.connect(uri, () => {
  console.log(`Mongoose connected to ${uri}`);
});

// HTTP Server
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const path = require("path");
const port = 8080;
var httpServer = express();
httpServer.use(morgan("tiny"));
httpServer.use(bodyParser.urlencoded({ extended: true }));
httpServer.use(bodyParser.json());
httpServer.use("/", express.static(path.join(__dirname, "public")));
httpServer.listen(port, () => {
  console.log(`Express listening on :${port}`);
});

// Session Middleware
const session = require("express-session");
const sessionMiddleware = session({
  secret: "keyboard cat",
  cookie: { expires: false }
});
httpServer.use(sessionMiddleware);

// REST API
const RESTServer = express.Router();
httpServer.use("/api", RESTServer);

// Temporary/Debug Endpoints
RESTServer.route("/debug/users").get((req, res) => {
  UserModel.find().exec((err, users) => {
    res.json(users);
  });
});
RESTServer.route("/debug/answers").get((req, res) => {
  AnswerModel.find().exec((err, answers) => {
    res.json(answers);
  });
});
RESTServer.route("/debug/questions").get((req, res) => {
  QuestionModel.find().exec((err, questions) => {
    res.json(questions);
  });
});

// User API
RESTServer.route("/users").post(crtUserHandler);
RESTServer.route("/users/:username/questions").get(getListByUserHandler);

// Me API
RESTServer.route("/users/me").get(getMeHandler);
RESTServer.route("/users/me").put(putMeHandler); // Queries: ?login ?logout
RESTServer.route("/users/me").delete(delMeHandler);

// Answers API
RESTServer.route("/answers").post(crtAnswerHandler);
RESTServer.route("/answers/:answerId").put(putAnswerHandler); // Queries: ?vote=(up|down)
RESTServer.route("/answers/:answerId").delete(() => {}); // todo

// Other API
RESTServer.route("/questions/random").get(getRandomQuestionHandler);
RESTServer.route("/questions/recent").get(getRecentListHandler);
RESTServer.route("/questions/top").get(getTopListHandler);

// Questions API
RESTServer.route("/questions").post(crtQuestionHandler);
RESTServer.route("/questions/:questionId").get(getQuestionHandler);
RESTServer.route("/questions/:questionId").put(putQuestionHandler); // Queries: ?star, ?bump=(up|down)
RESTServer.route("/questions/:questionId").delete(delQuestionHandler);

// User API Handlers
function crtUserHandler(req, res) {
  UserModel.create(
    {
      username: req.body.username
    },
    (err, user) => {
      // todo communicate dup username
      if (err) {
        res.status(500).send("Internal Error: Create User");
      } else {
        res.status(201).send(user);
      }
    }
  );
}
function getUserHandler(req, res) {
  UserModel.findOne({
    username: req.params.username
  }).exec((err, user) => {
    if (err) {
      res.status(500).send("Internal Error: Find User");
    } else if (!user) {
      res.status(404).send("Not Found: User");
    } else {
      QuestionModel.find({ author: user._id }, (err, questions) => {
        if (err) {
          res.status(500).send("Internal Error: Find User");
        } else {
          res.json({
            username: user.username,
            created: user.created,
            polls: questions
          });
        }
      });
    }
  });
}

// Me API Helpers
function isLoggedIn(req) {
  const sess = req.session;
  if (sess && sess.me && sess.me._id) {
    return req.session.me;
  } else {
    return undefined;
  }
}
function loginHelper(req, res) {
  UserModel.findOne({
    username: req.query.login
  }).exec((err, user) => {
    if (err) {
      res.status(500).send("Internal Error: Find User");
    } else if (!user) {
      res.status(404).send("Not Found: User");
    } else {
      req.session.me = user;
      res.status(200).send(user);
    }
  });
}
function logoutHelper(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      res.status(500).send("Internal Error");
    } else {
      res.status(200).send("logout");
    }
  });
}

// Me API Handlers
function getMeHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    res.json(me);
  }
}
function putMeHandler(req, res) {
  if (req.query.login) {
    loginHelper(req, res);
  } else if (!isLoggedIn(req)) {
    res.status(401).send("Unauthorized");
  } else if (req.query.hasOwnProperty("logout")) {
    logoutHelper(req, res);
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function delMeHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    UserModel.findByIdAndRemove(me._id).exec((err, user) => {
      if (err || !user) {
        res.status(500).send("Internal Error");
      } else {
        logoutHelper();
      }
    });
  }
}

// Questions API Helpers
function hasAnsweredHelper(userId, question) {} // todo
function hasVotedHelper(userId, answers) {
  var result = {};
  for (let i = 0; i < answers.length; i++) {
    let answer = answers[i];
    if (answer.votes.up.indexOf(userId) > -1) {
      result[answer._id] = 1;
    } else if (answer.votes.down.indexOf(userId) > -1) {
      result[answer._id] = -1;
    }
  }
  return result;
}
function hasStarredHelper(userId, stars) {
  if (stars.indexOf(userId) > -1) {
    return true;
  } else {
    return false;
  }
}
function hasBumppedHelper(userId, bumps) {
  if (bumps.up.indexOf(userId) > -1) {
    return 1;
  } else if (bumps.down.indexOf(userId) > -1) {
    return -1;
  } else {
    return 0;
  }
}
function voteUpResponseHelper(req, res) {
  const answerId = req.params.answerId;
  const meId = req.session.me._id;
  AnswerModel.findOneAndUpdate(
    {
      _id: answerId,
      type: "response",
      "votes.up": { $nin: [meId] },
      "votes.down": { $in: [meId] }
    },
    {
      $push: { "votes.up": meId },
      $pull: { "votes.down": meId },
      $inc: { "votes.sum": 2 }
    },
    (err, ans) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!ans) {
        AnswerModel.findOneAndUpdate(
          {
            _id: answerId,
            type: "response",
            "votes.up": { $nin: [meId] }
          },
          {
            $push: { "votes.up": meId },
            $inc: { "votes.sum": 1 }
          },
          (err, ans) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!ans) {
              AnswerModel.findOneAndUpdate(
                {
                  _id: answerId,
                  type: "response",
                  "votes.up": { $in: [meId] }
                },
                {
                  $pull: { "votes.up": meId },
                  $inc: { "votes.sum": -1 }
                },
                (err, ans) => {
                  if (err || !ans) {
                    res.status(500).send("Internal Error");
                  } else {
                    res.status(200).send("vote up toggle");
                  }
                }
              );
            } else {
              res.status(200).send("vote up");
            }
          }
        );
      } else {
        res.status(200).send("vote up change");
      }
    }
  );
}
function voteDownResponseHelper(req, res) {
  const answerId = req.params.answerId;
  const meId = req.session.me._id;
  AnswerModel.findOneAndUpdate(
    {
      _id: answerId,
      type: "response",
      "votes.down": { $nin: [meId] },
      "votes.up": { $in: [meId] }
    },
    {
      $push: { "votes.down": meId },
      $pull: { "votes.up": meId },
      $inc: { "votes.sum": -2 }
    },
    (err, ans) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!ans) {
        AnswerModel.findOneAndUpdate(
          {
            _id: answerId,
            type: "response",
            "votes.down": { $nin: [meId] }
          },
          {
            $push: { "votes.down": meId },
            $inc: { "votes.sum": -1 }
          },
          (err, ans) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!ans) {
              AnswerModel.findOneAndUpdate(
                {
                  _id: answerId,
                  type: "response",
                  "votes.down": { $in: [meId] }
                },
                {
                  $pull: { "votes.down": meId },
                  $inc: { "votes.sum": 1 }
                },
                (err, ans) => {
                  if (err || !ans) {
                    res.status(500).send("Internal Error");
                  } else {
                    res.status(200).send("vote down toggle");
                  }
                }
              );
            } else {
              res.status(200).send("vote down");
            }
          }
        );
      } else {
        res.status(200).send("vote down change");
      }
    }
  );
}
function voteOptionHelper(req, res) {
  const answerId = req.params.answerId;
  const meId = req.session.me._id;
  const meObjectId = mongoose.Types.ObjectId(meId);

  // find answers to this question that 'me' has voted on
  // if there are answers, 'me' cannot voted
  // else find the selected option and up vote
  AnswerModel.find({
    question: req.body.question,
    type: "option",
    "votes.up": { $in: [meId] }
  }).exec((err, answers) => {
    if (err) {
      res.status(500).send("Internal Error");
    } else if (answers.length > 0) {
      res.status(403).send("Forbidden: Revote");
    } else {
      AnswerModel.findOneAndUpdate(
        {
          _id: answerId,
          type: "option",
          "votes.up": { $nin: [meId] } // arbitrary
        },
        {
          $push: { "votes.up": meId },
          $inc: { "votes.sum": 1 }
        }
      ).exec((err, answer) => {
        if (err) {
          res.status(500).send("Internal Error");
        } else {
          res.status(200).send("vote");
        }
      });
    }
  });
}
function toggleStarHelper(req, res) {
  const questionId = req.params.questionId;
  const meId = req.session.me._id;
  QuestionModel.findOneAndUpdate(
    {
      _id: questionId,
      stars: { $nin: [meId] }
    },
    {
      $push: { stars: meId }
    },
    (err, question) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!question) {
        QuestionModel.findOneAndUpdate(
          {
            _id: questionId,
            stars: { $in: [meId] }
          },
          {
            $pull: { stars: meId }
          },
          (err, question) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else {
              res.status(200).send("star off");
            }
          }
        );
      } else {
        res.status(200).send("star on");
      }
    }
  );
}
function bumpUpHelper(req, res) {
  const questionId = req.params.questionId;
  const meId = req.session.me._id;
  QuestionModel.findOneAndUpdate(
    {
      _id: questionId,
      "bumps.up": { $nin: [meId] },
      "bumps.down": { $in: [meId] }
    },
    {
      $push: { "bumps.up": meId },
      $pull: { "bumps.down": meId },
      $inc: { "bumps.sum": 2 }
    },
    (err, question) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!question) {
        QuestionModel.findOneAndUpdate(
          {
            _id: questionId,
            "bumps.up": { $nin: [meId] }
          },
          {
            $push: { "bumps.up": meId },
            $inc: { "bumps.sum": 1 }
          },
          (err, question) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!question) {
              QuestionModel.findOneAndUpdate(
                {
                  _id: questionId,
                  "bumps.up": { $in: [meId] }
                },
                {
                  $pull: { "bumps.up": meId },
                  $inc: { "bumps.sum": -1 }
                },
                (err, question) => {
                  if (err || !question) {
                    res.status(500).send("Internal Error");
                  } else {
                    res.status(200).send("bump toggle");
                  }
                }
              );
            } else {
              res.status(200).send("bump");
            }
          }
        );
      } else {
        res.status(200).send("bump change");
      }
    }
  );
}
function bumpDownHelper(req, res) {
  const questionId = req.params.questionId;
  const meId = req.session.me._id;
  QuestionModel.findOneAndUpdate(
    {
      _id: questionId,
      "bumps.down": { $nin: [meId] },
      "bumps.up": { $in: [meId] }
    },
    {
      $push: { "bumps.down": meId },
      $pull: { "bumps.up": meId },
      $inc: { "bumps.sum": -2 }
    },
    (err, question) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!question) {
        QuestionModel.findOneAndUpdate(
          {
            _id: questionId,
            "bumps.down": { $nin: [meId] }
          },
          {
            $push: { "bumps.down": meId },
            $inc: { "bumps.sum": -1 }
          },
          (err, question) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!question) {
              QuestionModel.findOneAndUpdate(
                {
                  _id: questionId,
                  "bumps.down": { $in: [meId] }
                },
                {
                  $pull: { "bumps.down": meId },
                  $inc: { "bumps.sum": 1 }
                },
                (err, question) => {
                  if (err || !question) {
                    res.status(500).send("Internal Error");
                  } else {
                    res.status(200).send("bump toggle");
                  }
                }
              );
            } else {
              res.status(200).send("bump");
            }
          }
        );
      } else {
        res.status(200).send("bump change");
      }
    }
  );
}
function makeBlindHelper(req, question) {
  var blindQuestion = {
    _id: question._id,
    author: question.author.username,
    title: question.title,
    type: question.type,
    created: question.created,
    bumps: question.bumps.sum,
    stars: question.stars.length,
    answers: []
  };
  const me = isLoggedIn(req);
  if (me) {
    blindQuestion.me = {
      bumped: hasBumppedHelper(me._id, question.bumps),
      starred: hasStarredHelper(me._id, question.stars),
      voted: hasVotedHelper(me._id, question.answers)
    };
  }
  blindQuestion.answers = question.answers.map(answer => {
    return {
      _id: answer._id,
      content: answer.content,
      votes: answer.votes.sum,
      author: answer.author.username
    };
  });

  return blindQuestion;
}

// Answers API Handlers
function crtAnswerHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    let answer = new AnswerModel({
      question: req.body.questionId,
      author: me._id,
      type: "response",
      content: req.body.content
    });
    answer.save(err => {});
    QuestionModel.findOneAndUpdate(
      {
        _id: req.body.questionId
      },
      {
        $push: { answers: answer._id }
      }
    ).exec((err, question) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else {
        res.status(200).send("ok");
      }
    });
  }
}
function putAnswerHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (req.query.hasOwnProperty("vote")) {
    if (req.query.vote === "up") {
      voteUpResponseHelper(req, res);
    } else if (req.query.vote === "down") {
      voteDownResponseHelper(req, res);
    } else {
      voteOptionHelper(req, res);
    }
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}

// Other API Handlers
function getRandomQuestionHandler(req, res) {} // todo
function getRecentListHandler(req, res) {
  const lim = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  QuestionModel.find()
    .sort("-created")
    .limit(lim)
    .populate("author")
    .populate({
      path: "answers",
      populate: {
        path: "author"
      }
    })
    .exec((err, questions) => {
      if (err) {
        res.status(500).send("Internal Error: Find Polls");
      } else {
        let blinder = makeBlindHelper.bind(this, req);
        res.json(questions.map(blinder));
      }
    });
}
function getTopListHandler(req, res) {
  const lim = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  QuestionModel.find()
    .sort("-bumps.sum")
    .limit(lim)
    .populate("author")
    .populate({
      path: "answers",
      populate: {
        path: "author"
      }
    })
    .exec((err, questions) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else {
        let blinder = makeBlindHelper.bind(this, req);
        res.json(questions.map(blinder));
      }
    });
}
function getListByUserHandler(req, res) {
  // lookup user by id then query questions by user id
  const username = req.params.username;
  UserModel.findOne({
    username
  }).exec((err, user) => {
    if (err) {
      res.status(500).send("Internal Error");
    } else if (!user) {
      res.status(404).send(`Not found: ${username}`);
    } else {
      QuestionModel.find({
        author: user._id
      })
        .populate({
          path: "answers",
          populate: {
            path: "author"
          }
        })
        .exec((err, questions) => {
          if (err) {
            res.status(500).send("Internal Error");
          } else {
            // manually populate the polls
            questions.forEach(question => {
              question.author = user;
            });
            let blinder = makeBlindHelper.bind(this, req);
            res.json(questions.map(blinder));
          }
        });
    }
  });
}

// Questions API Handlers
function crtQuestionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    let isPoll =
      !!req.body.hasOwnProperty("answers") && req.body.answers.length > 1;
    let question = new QuestionModel({
      author: me._id,
      title: req.body.title,
      type: isPoll ? "poll" : "discussion"
    });
    if (isPoll) {
      for (let i = 0; i < req.body.answers.length; i++) {
        let answer = new AnswerModel({
          question: question._id,
          author: me._id,
          type: "option",
          content: req.body.answers[i]
        });
        answer.save(err => {
          // todo (what to do when child doc doesnt save)
          // use hooks?
        });
        question.answers.push(answer._id);
      }
    }
    question.save(err => {
      if (err) {
        res.status(500).send("Internal Error");
      } else {
        res.status(200).send("ok");
      }
    });
  }
}
function getQuestionHandler(req, res) {
  QuestionModel.findById(req.params.questionId)
    .populate("author")
    .populate({
      path: "answers",
      populate: {
        path: "author"
      }
    })
    .exec((err, question) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!question) {
        res.status(404).send("Not Found");
      } else {
        res.json(makeBlindHelper(req, question));
      }
    });
}
function putQuestionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (req.query.hasOwnProperty("star")) {
    toggleStarHelper(req, res);
  } else if (req.query.hasOwnProperty("bump")) {
    if (req.query.bump === "up") {
      bumpUpHelper(req, res);
    } else if (req.query.bump === "down") {
      bumpDownHelper(req, res);
    }
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function delQuestionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    QuestionModel.findOneAndRemove({
      _id: req.params.questionId,
      author: { $eq: mongoose.Types.ObjectId(me._id) }
    }).exec((err, question) => {
      if (err || !question) {
        res.status(500).send("Internal Error");
      } else {
        res.status(200).send("delete");
      }
    });
  }
}
