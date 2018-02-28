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
const MetaSchema = new Schema({
  author: {
    type: Schema.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ["discussion", "question", "answer", "poll", "option"]
  },
  created: {
    type: Date,
    default: Date.now
  },
  content: {
    title: String,
    body: String
  },
  parent: {
    type: Schema.ObjectId,
    ref: "Meta"
  },
  children: [
    {
      type: Schema.ObjectId,
      ref: "Meta"
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
const MetaModel = mongoose.model("Meta", MetaSchema);

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
RESTServer.route("/debug/metas").get((req, res) => {
  MetaModel.find({
    type: { $in: ["discussion", "question", "poll"] }
  }).exec((err, metas) => {
    res.json(metas);
  });
});
RESTServer.route("/debug/discussions").get((req, res) => {
  MetaModel.find({
    type: "discussion"
  }).exec((err, metas) => {
    res.json(metas);
  });
});
RESTServer.route("/debug/questions").get((req, res) => {
  MetaModel.find({
    type: "question"
  }).exec((err, metas) => {
    res.json(metas);
  });
});
RESTServer.route("/debug/answers").get((req, res) => {
  MetaModel.find({
    type: "answer"
  }).exec((err, metas) => {
    res.json(metas);
  });
});
RESTServer.route("/debug/polls").get((req, res) => {
  MetaModel.find({
    type: "poll"
  }).exec((err, metas) => {
    res.json(metas);
  });
});
RESTServer.route("/debug/options").get((req, res) => {
  MetaModel.find({
    type: "option"
  }).exec((err, metas) => {
    res.json(metas);
  });
});

// User API
RESTServer.route("/users").post(crtUserHandler);
RESTServer.route("/users/:username").get(getUserHandler);

// Me API
RESTServer.route("/users/me").get(getMeHandler);
RESTServer.route("/users/me").put(putMeHandler); // Queries: ?login ?logout
RESTServer.route("/users/me").delete(delMeHandler);

// TBD API
RESTServer.route("/metas/random").get(getRandomMetaHandler);
RESTServer.route("/metas/recent").get(getRecentMetaListHandler);
RESTServer.route("/metas/top").get(getTopMetaListHandler);

// Discussions API
RESTServer.route("/discussions").post(crtDiscussionHandler);
RESTServer.route("/discussions/:metaId").get(getDiscussionHandler);
RESTServer.route("/discussions/:metaId").put(putDiscussionHandler); // Queries: ?reply, ?star, ?bump=(up|down)
RESTServer.route("/discussions/:metaId").delete(delDiscussionHandler);

// Questions API
RESTServer.route("/questions").post(crtQuestionHandler);
RESTServer.route("/questions/:metaId").get(getQuestionHandler);
RESTServer.route("/questions/:metaId").put(putQuestionHandler); // Queries: ?answer, ?upVote=answerId, ?downVote=answerId, ?star, ?bump=(up|down)
RESTServer.route("/questions/:metaId").delete(delQuestionHandler);

// Polls API
RESTServer.route("/polls").post(crtPollHandler);
RESTServer.route("/polls/:metaId").get(getPollHandler);
RESTServer.route("/polls/:metaId").put(putPollHandler); // Queries: ?vote=optionId, ?star, ?bump=(up|down)
RESTServer.route("/polls/:metaId").delete(delPollHandler);

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
  const serializer = serializeMetaHelper.bind(null, req);
  UserModel.findOne({
    username: req.params.username
  }).exec((err, user) => {
    if (err) {
      res.status(500).send("Internal Error: Find User");
    } else if (!user) {
      res.status(404).send("Not Found: User");
    } else {
      MetaModel.find({
        author: user._id,
        type: { $in: ["discussion", "question", "poll"] }
      })
        .populate("children")
        .exec((err, metas) => {
          if (err) {
            res.status(500).send("Internal Error: Find User");
          } else {
            metas.forEach(meta => {
              // manually populate the author
              meta.author = user;
            });
            res.json({
              username: user.username,
              created: user.created,
              metas: metas.map(serializer)
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

// other helpers
function hasAnsweredHelper(userId, question) {} // todo
function hasBumppedHelper(userId, bumps) {
  if (bumps.up.indexOf(userId) > -1) {
    return 1;
  } else if (bumps.down.indexOf(userId) > -1) {
    return -1;
  } else {
    return 0;
  }
}
function hasStarredHelper(userId, stars) {
  if (stars.indexOf(userId) > -1) {
    return true;
  } else {
    return false;
  }
}
function hasVotedHelper(userId, children) {
  var result = {};
  for (let i = 0; i < children.length; i++) {
    result[children[i]._id] = hasBumppedHelper(userId, children[i].bumps);
  }
  return result;
}

// Meta Helpers
function serializeMetaHelper(req, meta) {
  var serialized = {
    _id: meta._id,
    author: meta.author.username,
    content: meta.content,
    type: meta.type,
    created: meta.created,
    bumps: meta.bumps.sum,
    stars: meta.stars.length,
    ...(meta.type === "discussion" && {
      responses: meta.children.length
    }),
    ...(meta.type === "question" && { answers: meta.children.length }),
    ...(meta.type === "poll" && {
      votes: meta.children.reduce((sum, option) => sum + option.bumps.sum, 0)
    })
  };
  const me = isLoggedIn(req);
  if (me) {
    serialized.me = {
      bumped: hasBumppedHelper(me._id, meta.bumps),
      ...((meta.type === "discussion" || meta.type === "question") && {
        starred: hasStarredHelper(me._id, meta.stars)
      }),
      ...((meta.type === "question" || meta.type === "poll") && {
        voted: hasVotedHelper(me._id, meta.children)
      })
    };
  }
  return serialized;
}
function starToggleMetaHelper(req, res) {
  const meId = req.session.me._id;
  MetaModel.findOneAndUpdate(
    {
      _id: req.params.metaId,
      type: { $in: ["discussion", "question", "poll"] },
      stars: { $nin: [meId] }
    },
    {
      $push: { stars: meId }
    },
    (err, meta) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!meta) {
        MetaModel.findOneAndUpdate(
          {
            _id: req.params.metaId,
            type: { $in: ["discussion", "question", "poll"] },
            stars: { $in: [meId] }
          },
          {
            $pull: { stars: meId }
          },
          (err, meta) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!meta) {
              // either not found or invalid query
              res.status(404).send("Not Found");
            } else {
              res.status(204).send(); // star turned off
            }
          }
        );
      } else {
        res.status(204).send(); // star turned on
      }
    }
  );
}
function bumpUpMetaHelper(req, res) {
  const meId = req.session.me._id;
  MetaModel.findOneAndUpdate(
    {
      _id: req.params.metaId,
      type: { $in: ["discussion", "question", "poll"] },
      "bumps.up": { $nin: [meId] },
      "bumps.down": { $in: [meId] }
    },
    {
      $push: { "bumps.up": meId },
      $pull: { "bumps.down": meId },
      $inc: { "bumps.sum": 2 }
    },
    (err, meta) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!meta) {
        MetaModel.findOneAndUpdate(
          {
            _id: req.params.metaId,
            type: { $in: ["discussion", "question", "poll"] },
            "bumps.up": { $nin: [meId] }
          },
          {
            $push: { "bumps.up": meId },
            $inc: { "bumps.sum": 1 }
          },
          (err, meta) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!meta) {
              MetaModel.findOneAndUpdate(
                {
                  _id: req.params.metaId,
                  type: { $in: ["discussion", "question", "poll"] },
                  "bumps.up": { $in: [meId] }
                },
                {
                  $pull: { "bumps.up": meId },
                  $inc: { "bumps.sum": -1 }
                },
                (err, meta) => {
                  if (err) {
                    res.status(500).send("Internal Error");
                  } else if (!meta) {
                    // either not found or invalid query
                    res.status(404).send("Not Found");
                  } else {
                    res.status(204).send(); // bump up toggled
                  }
                }
              );
            } else {
              res.status(204).send(); // bumpped up
            }
          }
        );
      } else {
        res.status(204).send(); // bump changed direction (bumpped down)
      }
    }
  );
}
function bumpDownMetaHelper(req, res) {
  const meId = req.session.me._id;
  MetaModel.findOneAndUpdate(
    {
      _id: req.params.metaId,
      type: { $in: ["discussion", "question", "poll"] },
      "bumps.down": { $nin: [meId] },
      "bumps.up": { $in: [meId] }
    },
    {
      $push: { "bumps.down": meId },
      $pull: { "bumps.up": meId },
      $inc: { "bumps.sum": -2 }
    },
    (err, meta) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!meta) {
        MetaModel.findOneAndUpdate(
          {
            _id: req.params.metaId,
            type: { $in: ["discussion", "question", "poll"] },
            "bumps.down": { $nin: [meId] }
          },
          {
            $push: { "bumps.down": meId },
            $inc: { "bumps.sum": -1 }
          },
          (err, meta) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!meta) {
              MetaModel.findOneAndUpdate(
                {
                  _id: req.params.metaId,
                  type: { $in: ["discussion", "question", "poll"] },
                  "bumps.down": { $in: [meId] }
                },
                {
                  $pull: { "bumps.down": meId },
                  $inc: { "bumps.sum": 1 }
                },
                (err, meta) => {
                  if (err) {
                    res.status(500).send("Internal Error");
                  } else if (!meta) {
                    // either not found or invalid query
                    res.status(404).send("Not Found");
                  } else {
                    res.status(204).send(); // bump down toggled
                  }
                }
              );
            } else {
              res.status(204).send(); // bumpped down
            }
          }
        );
      } else {
        res.status(204).send(); // bump changed direction (bumpped up)
      }
    }
  );
}
function getRandomMetaHandler(req, res) {} // todo
function getRecentMetaListHandler(req, res) {
  const lim = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  const serializer = serializeMetaHelper.bind(null, req);
  MetaModel.find({
    type: { $in: ["discussion", "question", "poll"] }
  })
    .sort("-created")
    .limit(lim)
    .populate("author")
    .populate("children")
    .exec((err, metas) => {
      if (err) {
        res.status(500).send("Internal Error: Find Polls");
      } else {
        res.json(metas.map(serializer));
      }
    });
}
function getTopMetaListHandler(req, res) {
  const lim = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  const serializer = serializeMetaHelper.bind(null, req);
  MetaModel.find({ type: { $in: ["discussion", "question", "poll"] } })
    .sort("-bumps.sum")
    .limit(lim)
    .populate("author")
    .populate("children")
    .exec((err, metas) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else {
        res.json(metas.map(serializer));
      }
    });
}

// Discussion Helpers
function serializeDiscussionHelper(req, meta) {
  var serialized = serializeMetaHelper(req, meta);
  var serializer = serializeMetaHelper.bind(null, req);
  serialized.children = meta.children.map(serializer);
  return serialized;
}
function replyDiscussionHelper(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (!req.body.body) {
    res.status(400).send("Bad Request");
  } else {
    let response = new MetaModel({
      parent: req.params.metaId,
      author: me._id,
      type: "discussion",
      content: {
        body: req.body.body
      }
    });
    MetaModel.findOneAndUpdate(
      {
        _id: req.params.metaId,
        type: "discussion"
      },
      {
        $push: { children: response._id }
      }
    ).exec((err, disc) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!disc) {
        res.status(404).send("Not Found");
      } else {
        response.content.title = `re: ${disc.content.title}`;
        response.save(err => {});
        res.status(201).send({ id: response._id });
      }
    });
  }
}

// Question Helpers
function serializeQuestionHelper(req, meta) {
  var serialized = serializeMetaHelper(req, meta);
  var serializer = serializeMetaHelper.bind(null, req);
  serialized.children = meta.children.map(serializer);
  return serialized;
}
function replyQuestionHelper(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (!req.body.body) {
    res.status(400).send("Bad Request");
  } else {
    let answer = new MetaModel({
      parent: req.params.metaId,
      author: me._id,
      type: "answer",
      content: {
        body: req.body.body
      }
    });
    answer.save(err => {});
    MetaModel.findOneAndUpdate(
      {
        _id: req.params.metaId,
        type: "question"
      },
      {
        $push: { children: answer._id }
      }
    ).exec((err, quest) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!quest) {
        res.status(404).send("Not Found");
      } else {
        res.status(201).send({ id: answer._id });
      }
    });
  }
}
function voteUpAnswerHelper(req, res) {
  const answerId = req.query.upVote;
  const meId = req.session.me._id;
  MetaModel.findOneAndUpdate(
    {
      _id: answerId,
      type: "answer",
      "bumps.up": { $nin: [meId] },
      "bumps.down": { $in: [meId] }
    },
    {
      $push: { "bumps.up": meId },
      $pull: { "bumps.down": meId },
      $inc: { "bumps.sum": 2 }
    },
    (err, ans) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!ans) {
        MetaModel.findOneAndUpdate(
          {
            _id: answerId,
            type: "answer",
            "bumps.up": { $nin: [meId] }
          },
          {
            $push: { "bumps.up": meId },
            $inc: { "bumps.sum": 1 }
          },
          (err, ans) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!ans) {
              MetaModel.findOneAndUpdate(
                {
                  _id: answerId,
                  type: "answer",
                  "bumps.up": { $in: [meId] }
                },
                {
                  $pull: { "bumps.up": meId },
                  $inc: { "bumps.sum": -1 }
                },
                (err, ans) => {
                  if (err || !ans) {
                    res.status(500).send("Internal Error");
                  } else {
                    res.status(204).send(); // voted up toggle
                  }
                }
              );
            } else {
              res.status(204).send(); // voted up
            }
          }
        );
      } else {
        res.status(204).send(); // vote changed (voted down)
      }
    }
  );
}
function voteDownAnswerHelper(req, res) {
  const answerId = req.query.downVote;
  const meId = req.session.me._id;
  MetaModel.findOneAndUpdate(
    {
      _id: answerId,
      type: "answer",
      "bumps.down": { $nin: [meId] },
      "bumps.up": { $in: [meId] }
    },
    {
      $push: { "bumps.down": meId },
      $pull: { "bumps.up": meId },
      $inc: { "bumps.sum": -2 }
    },
    (err, ans) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!ans) {
        MetaModel.findOneAndUpdate(
          {
            _id: answerId,
            type: "answer",
            "bumps.down": { $nin: [meId] }
          },
          {
            $push: { "bumps.down": meId },
            $inc: { "bumps.sum": -1 }
          },
          (err, ans) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!ans) {
              MetaModel.findOneAndUpdate(
                {
                  _id: answerId,
                  type: "answer",
                  "bumps.down": { $in: [meId] }
                },
                {
                  $pull: { "bumps.down": meId },
                  $inc: { "bumps.sum": 1 }
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

// Poll Helpers
function serializePollHelper(req, meta) {
  var serialized = serializeMetaHelper(req, meta);
  serialized.options = meta.children.map(option => {
    return {
      _id: option.id,
      content: option.content.body,
      votes: option.bumps.sum
    };
  });
  return serialized;
}
function voteOptionHelper(req, res) {
  const meId = req.session.me._id;

  // find answers to this question that 'me' has voted on
  // if there are answers, 'me' cannot voted
  // else find the selected option and up vote
  MetaModel.find({
    parent: req.params.metaId,
    type: "option",
    "bumps.up": { $in: [meId] }
  }).exec((err, options) => {
    if (err) {
      res.status(500).send("Internal Error");
    } else if (options.length > 0) {
      res.status(403).send("Forbidden: Revote");
    } else {
      MetaModel.findOneAndUpdate(
        {
          _id: req.query.vote,
          type: "option",
          "bumps.up": { $nin: [meId] } // arbitrary
        },
        {
          $push: { "bumps.up": meId },
          $inc: { "bumps.sum": 1 }
        }
      ).exec((err, answer) => {
        if (err) {
          res.status(500).send("Internal Error");
        } else {
          res.status(204).send();
        }
      });
    }
  });
}

// Discussion CRUD
function crtDiscussionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    MetaModel.create(
      {
        author: me._id,
        content: {
          title: req.body.title
        },
        type: "discussion"
      },
      (err, disc) => {
        if (err) {
          res.status(500).send("Internal Error");
        } else {
          res.status(201).send({ id: disc._id });
        }
      }
    );
  }
}
function getDiscussionHandler(req, res) {
  populateChildren(req.params.metaId);
  MetaModel.findOne({
    _id: req.params.metaId,
    type: "discussion"
  })
    .populate("author")
    .populate({
      path: "children",
      populate: {
        path: "author"
      }
    })
    .exec((err, disc) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!disc) {
        res.status(404).send("Not Found");
      } else {
        res.json(disc);
      }
    });
}
function putDiscussionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (req.query.hasOwnProperty("reply")) {
    replyDiscussionHelper(req, res);
  } else if (req.query.hasOwnProperty("star")) {
    starToggleMetaHelper(req, res);
  } else if (req.query.bump === "up") {
    bumpUpMetaHelper(req, res);
  } else if (req.query.bump === "down") {
    bumpDownMetaHelper(req, res);
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function delDiscussionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    // todo: should it delete all non-owned child discussions?
    MetaModel.findOneAndRemove({
      _id: req.params.metaId,
      type: "discussion",
      author: { $eq: mongoose.Types.ObjectId(me._id) }
    }).exec((err, disc) => {
      if (err || !disc) {
        res.status(500).send("Internal Error");
      } else {
        res.status(204).send();
      }
    });
  }
}

// Questions CRUD
function crtQuestionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    MetaModel.create(
      {
        author: me._id,
        content: {
          title: req.body.title
        },
        type: "question"
      },
      (err, quest) => {
        if (err) {
          res.status(500).send("Internal Error");
        } else {
          res.status(201).send({ id: quest._id });
        }
      }
    );
  }
}
function getQuestionHandler(req, res) {
  MetaModel.findOne({
    _id: req.params.metaId,
    type: "question"
  })
    .populate("author")
    .populate({
      path: "children",
      populate: {
        path: "author"
      }
    })
    .exec((err, quest) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!quest) {
        res.status(404).send("Not Found");
      } else {
        res.json(serializeQuestionHelper(req, quest));
      }
    });
}
function putQuestionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (req.query.hasOwnProperty("answer")) {
    replyQuestionHelper(req, res);
  } else if (req.query.upVote) {
    voteUpAnswerHelper(req, res);
  } else if (req.query.downVote) {
    voteDownAnswerHelper(req, res);
  } else if (req.query.hasOwnProperty("star")) {
    starToggleMetaHelper(req, res);
  } else if (req.query.bump === "up") {
    bumpUpMetaHelper(req, res);
  } else if (req.query.bump === "down") {
    bumpDownMetaHelper(req, res);
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function delQuestionHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    // todo: should it delete all non-owned child answers?
    MetaModel.findOneAndRemove({
      _id: req.params.metaId,
      type: "question",
      author: { $eq: mongoose.Types.ObjectId(me._id) }
    }).exec((err, quest) => {
      if (err || !quest) {
        res.status(500).send("Internal Error");
      } else {
        res.status(204).send();
      }
    });
  }
}

// Poll CRUD
function crtPollHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (!req.body.options || req.body.options.length < 2) {
    res.status(400).send("Bad Request");
  } else {
    let poll = new MetaModel({
      author: me._id,
      type: "poll",
      content: {
        title: req.body.title,
        body: req.body.body
      },
      children: []
    });

    for (let content in req.body.options) {
      let option = new MetaModel({
        author: me._id,
        type: "option",
        parent: poll._id,
        content: {
          body: content
        }
      });
      option.save(err => {
        // todo: how to handle when child options doesnt save
        // need revert db changes and cancel procedure
      });
      poll.children.push(option._id);
    }

    poll.save(err => {
      if (err) {
        res.status(500).send("Internal Error");
      } else {
        res.status(201).send({ id: poll._id });
      }
    });
  }
}
function getPollHandler(req, res) {
  MetaModel.findOne({
    _id: req.params.metaId,
    type: "poll"
  })
    .populate("author")
    .populate("children")
    .exec((err, poll) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!poll) {
        res.status(404).send("Not Found");
      } else {
        res.json(serializePollHelper(req, poll));
      }
    });
}
function putPollHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else if (req.query.vote) {
    voteOptionHelper(req, res);
  } else if (req.query.hasOwnProperty("star")) {
    starToggleMetaHelper(req, res);
  } else if (req.query.bump === "up") {
    bumpUpMetaHelper(req, res);
  } else if (req.query.bump === "down") {
    bumpDownMetaHelper(req, res);
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function delPollHandler(req, res) {
  const me = isLoggedIn(req);
  if (!me) {
    res.status(401).send("Unauthorized");
  } else {
    // todo: delete all owned child options
    MetaModel.findOneAndRemove({
      _id: req.params.metaId,
      type: "poll",
      author: { $eq: mongoose.Types.ObjectId(me._id) }
    }).exec((err, poll) => {
      if (err || !poll) {
        res.status(500).send("Internal Error");
      } else {
        res.status(204).send();
      }
    });
  }
}
