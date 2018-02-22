// object database
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ItemSchema = new Schema({
  content: String,
  votes: {
    type: Number,
    default: 0
  }
});
const PostSchema = new Schema({
  author: {
    type: Schema.ObjectId,
    index: true,
    ref: "User"
  },
  title: String,
  created: {
    type: Date,
    default: Date.now
  },
  items: [ItemSchema],
  meta: {
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
        ref: "Post"
      }
    ],
    // todo record vote and allow change
    voters: [
      {
        type: Schema.ObjectId,
        ref: "User"
      }
    ]
  }
});
PostSchema.virtual("bumps").get(function() {
  return this.meta.bumps.up.length - this.meta.bumps.down.length;
});
PostSchema.virtual("stars").get(function() {
  return this.meta.stars.length;
});
PostSchema.virtual("votes").get(function() {
  return this.meta.voters.length;
});
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
const PostModel = mongoose.model("Post", PostSchema);
const UserModel = mongoose.model("User", UserSchema);
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
RESTServer.route("/posts").post(createPostHandler); // Queries: ?limit=[Integer]
RESTServer.route("/posts").get((req, res) => {
  PostModel.find().exec((err, posts) => {
    res.json(posts);
  });
});
RESTServer.route("/posts/random").get(getRandomPostHandler);
RESTServer.route("/posts/recent").get(getRecentPostListHandler);
RESTServer.route("/posts/top").get(getTopPostListHandler);
RESTServer.route("/posts/:postid").get(getPostHandler);
RESTServer.route("/posts/:postid").put(putPostHandler); // Queries: ?star, ?bump=(up|down)
RESTServer.route("/posts/:postid/:itemid").put(putPostItemHandler); // Queries: ?vote=[itemId]
RESTServer.route("/posts/:postid").delete(deletePostHandler);

RESTServer.route("/users").post(postUserHandler);
RESTServer.route("/users").get((req, res) => {
  UserModel.find().exec((err, users) => {
    res.json(users);
  });
});
RESTServer.route("/users/me").get(getMeHandler);
RESTServer.route("/users/me").put(putMeHandler); // Queries: ?login ?logout
RESTServer.route("/users/:username").get(getUserHandler);
RESTServer.route("/users/:username/posts").get(getUserPostListHandler);
RESTServer.route("/users/:username").delete(delUserHandler);
httpServer.use("/api", RESTServer);

// Request Helpers
function isLoggedIn(req) {
  return req.session && req.session.user;
}

// Handlers
function createPostHandler(req, res) {
  if (!isLoggedIn(req)) {
    res.status(401).send("Unauthorized");
  } else {
    // todo validate input
    items = req.body.items.map(content => {
      return { content };
    });
    PostModel.create(
      { author: req.session.user._id, title: req.body.title, items },
      (crtErr, post) => {
        if (crtErr) {
          res.status(500).send("Internal Error: Create Post");
        } else {
          res.status(201).send(post);
        }
      }
    );
  }
}
function getRandomPostHandler(req, res) {
  // todo does not scale
  // todo return n=limit random posts
  //let lim = req.query.limit ? parseInt(req.query.limit, 10) : 1;
  PostModel.count().exec((countErr, count) => {
    if (countErr) {
      res.status(500).send("Internal Error");
    } else {
      let randPostIdx = parseInt(Math.random() * count, 10);
      PostModel.findOne()
        .skip(randPostIdx)
        .exec((postErr, post) => {
          if (postErr) {
            res.status(500).send("Internal Error");
          } else if (!post) {
            res.status(404).send("Not Found: Post");
          } else {
            post.author = post.author.username;
            res.json(post);
          }
        });
    }
  });
}
function getRecentPostListHandler(req, res) {
  let lim = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  PostModel.find()
    .sort("-created")
    .limit(lim)
    .populate("author")
    .exec((findErr, posts) => {
      if (findErr) {
        res.status(500).send("Internal Error: Find Posts");
      } else {
        res.json(posts);
      }
    });
}
function getTopPostListHandler(req, res) {
  let lim = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  PostModel.find()
    .sort("-meta.bumps.sum")
    .limit(lim)
    .populate("author")
    .exec((err, posts) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else {
        res.json(posts);
      }
    });
}
function getUserPostListHandler(req, res) {
  // do a user lookup first instead of a populate
  UserModel.findOne({
    username: req.params.username
  }).exec((findErr, user) => {
    if (findErr) {
      res.status(500).send("Internal Error: Find Username");
    } else if (!user) {
      res.status(404).send("Not Found: User");
    } else {
      PostModel.find()
        .where("author")
        .equals(user._id)
        .sort("-created")
        .exec((postsErr, posts) => {
          if (postsErr) {
            res.status(500).send("Internal Error: Find Posts By Username");
          } else {
            res.json(posts);
          }
        });
    }
  });
}
function getPostHandler(req, res) {
  PostModel.findById(req.params.postid)
    .populate("author")
    .exec((findErr, post) => {
      if (findErr) {
        res.status(500).send("Internal Error");
      } else {
        res.json(post);
      }
    });
}
function putPostHandler(req, res) {
  if (!isLoggedIn(req)) {
    res.status(401).send("Unauthorized");
  } else if (req.query.hasOwnProperty("star")) {
    toggleStarHelper(req, res);
  } else if (req.query.bump === "up") {
    bumpUpHelper(req, res);
  } else if (req.query.bump === "down") {
    bumpDownHelper(req, res);
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function putPostItemHandler(req, res) {
  if (!isLoggedIn(req)) {
    res.status(401).send("Unauthorized");
  } else if (req.query.vote) {
    PostModel.findById(req.params.postid, (postErr, post) => {
      let userId = mongoose.Types.ObjectId(req.session.user._id);
      if (postErr) {
        res.status(500).send("Internal Error: Find Post");
      } else if (post.meta.voters.find(voterId => userId.equals(voterId))) {
        // reject vote more than once
        res.status(403).send("Forbidden: Vote More Than Once");
      } else if (
        //reject vote for own
        userId.equals(post.author)
      ) {
        res.status(403).send("Forbidden: Vote For Own");
      } else {
        post.meta.voters.push(userId);
        post.items.id(req.params.itemid).votes += 1;
        post.save();
        res.status(200).send("Voted");
      }
    });
  } else {
    res.status(400).send("Bad Request: Invalid Query");
  }
}
function deletePostHandler(req, res) {
  if (!isLoggedIn(req)) {
    res.status(401).send("Unauthorized");
  } else {
    PostModel.findById(req.params.postid, (postErr, post) => {
      if (postErr) {
        res.status(500).send("Internal Error");
      } else if (
        !mongoose.Types.ObjectId(req.session.user._id).equals(post.author)
      ) {
        res.status(403).send("Forbidden: Delete Other User Post");
      } else {
        post.remove(removeErr => {
          if (removeErr) {
            res.status(500).send("Internal Error");
          } else {
            res.json({ msg: "deleted", _id: post.id });
          }
        });
      }
    });
  }
}

function postUserHandler(req, res) {
  UserModel.create(
    {
      username: req.body.username
    },
    (crtErr, user) => {
      // todo communicate dup username
      if (crtErr) {
        res.status(500).send("Internal Error: Create User");
      } else {
        res.status(201).send(user);
      }
    }
  );
}
function getMeHandler(req, res) {
  if (!isLoggedIn(req)) {
    res.status(401).send("Unauthorized");
  } else {
    UserModel.findById(req.session.user._id).exec((findErr, me) => {
      if (findErr) {
        res.status(500).send("Internal Error: Find Me");
      } else if (!me) {
        res.status(404).send("Not Found: Me");
      } else {
        res.json(me);
      }
    });
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
function getUserHandler(req, res) {
  UserModel.findOne({
    username: req.params.username
  }).exec((findErr, user) => {
    if (findErr) {
      res.status(500).send("Internal Error: Find User");
    } else if (!user) {
      res.status(404).send("Not Found: User");
    } else {
      PostModel.find({ author: user._id }, (err, posts) => {
        if (err) {
          res.status(500).send("Internal Error: Find User");
        } else {
          res.json({
            username: user.username,
            created: user.created,
            posts: posts
          });
        }
      });
    }
  });
}
function delUserHandler(req, res) {
  UserModel.remove({
    username: req.params.username
  }).exec((remErr, doc) => {
    if (remErr) {
      res.status(500).send("Internal Error");
    } else {
      res.status(200).send("Deleted");
    }
  });
}

function loginHelper(req, res) {
  UserModel.findOne({
    username: req.query.login
  }).exec((userErr, user) => {
    if (userErr) {
      res.status(500).send("Internal Error: Find User");
    } else if (!user) {
      res.status(404).send("Not Found: User");
    } else {
      // todo rethink http verb and status code
      req.session.user = user;
      res.status(200).send(user);
    }
  });
}
function logoutHelper(req, res) {
  req.session.destroy(function(sessErr) {
    if (sessErr) {
      res.status(500).send("Internal Error");
    } else {
      res.status(200).send("logout");
    }
  });
}
function bumpUpHelper(req, res) {
  const userId = req.session.user._id;
  const postId = req.params.postid;

  PostModel.findOneAndUpdate(
    {
      _id: postId,
      "meta.bumps.up": { $nin: [userId] },
      "meta.bumps.down": { $in: [userId] }
    },
    {
      $push: { "meta.bumps.up": userId },
      $pull: { "meta.bumps.down": userId },
      $inc: { "meta.bumps.sum": 2 }
    },
    (err, post) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!post) {
        PostModel.findOneAndUpdate(
          {
            _id: postId,
            "meta.bumps.up": { $nin: [userId] }
          },
          {
            $push: { "meta.bumps.up": userId },
            $inc: { "meta.bumps.sum": 1 }
          },
          (err, post) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!post) {
              PostModel.findOneAndUpdate(
                {
                  _id: postId,
                  "meta.bumps.up": { $in: [userId] }
                },
                {
                  $pull: { "meta.bumps.up": userId },
                  $inc: { "meta.bumps.sum": -1 }
                },
                (err, post) => {
                  if (err) {
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
  const userId = req.session.user._id;
  const postId = req.params.postid;

  PostModel.findOneAndUpdate(
    {
      _id: postId,
      "meta.bumps.down": { $nin: [userId] },
      "meta.bumps.up": { $in: [userId] }
    },
    {
      $push: { "meta.bumps.down": userId },
      $pull: { "meta.bumps.up": userId },
      $inc: { "meta.bumps.sum": -2 }
    },
    (err, post) => {
      if (err) {
        res.status(500).send("Internal Error");
      } else if (!post) {
        PostModel.findOneAndUpdate(
          {
            _id: postId,
            "meta.bumps.down": { $nin: [userId] }
          },
          {
            $push: { "meta.bumps.down": userId },
            $inc: { "meta.bumps.sum": -1 }
          },
          (err, post) => {
            if (err) {
              res.status(500).send("Internal Error");
            } else if (!post) {
              PostModel.findOneAndUpdate(
                {
                  _id: postId,
                  "meta.bumps.down": { $in: [userId] }
                },
                {
                  $pull: { "meta.bumps.down": userId },
                  $inc: { "meta.bumps.sum": 1 }
                },
                (err, post) => {
                  if (err) {
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
function toggleStarHelper(req, res) {
  const userId = req.session.user._id;
  const postId = req.params.postid;
  PostModel.findOneAndUpdate(
    {
      _id: postId,
      "meta.stars": { $nin: [userId] }
    },
    {
      $push: { "meta.stars": userId }
    },
    (findOffErr, post) => {
      if (findOffErr) {
        res.status(500).send("Internal Error");
      } else if (!post) {
        PostModel.findOneAndUpdate(
          {
            _id: postId,
            "meta.stars": { $in: [userId] }
          },
          {
            $pull: { "meta.stars": userId }
          },
          (findOnErr, post) => {
            if (findOnErr) {
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
