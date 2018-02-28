// https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site
function timeSince(date) {
  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + " years";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}

// Helpers
function appendAlert(msg) {
  var $el = $(`<li style="width: 100%; border:">${msg}</li>`);
  $el.appendTo("#alerts");
  setTimeout(function() {
    $el.remove();
  }, 2000);
}
function appendMetaHeader(where = "body", meta) {
  $(where).append(`
    <table border="1" style="width: 100%; margin-bottom: 5px;">
      <tbody>
        <tr>
          <td style="padding: 10px; text-align: center;">
            <a href="" id="do-bump-up-meta" data-type="${meta.type}" data-id="${
    meta._id
  }" style="text-decoration: none;">
              ${meta.me && meta.me.bumped > 0 ? "&#9650;" : "&#9651;"}
            </a>
              </br>
              ${meta.bumps}
              </br>
            <a href="" id="do-bump-down-meta" data-type="${
              meta.type
            }" data-id="${meta._id}" style="text-decoration: none;">
              ${meta.me && meta.me.bumped < 0 ? "&#9660;" : "&#9661;"}
            </a>
          </td>
          <td style="padding: 10px;" width="75%">
            <h3>
            <a href="" id="show-meta" data-type="${meta.type}" data-id="${
    meta._id
  }">${meta.content.title}</a>
            </h3>
            <p>${meta.content.body ? meta.content.body : ""}</p>
            <p>
              by <a id="show-user" data-id="${meta.author}" href="">${
    meta.author
  }</a>
              ${timeSince(Date.parse(meta.created))} ago
              </br>
              ${
                meta.type === "discussion" || meta.type === "response"
                  ? meta.responses + " responses"
                  : meta.type === "question"
                    ? meta.answers + " answers"
                    : meta.votes + " votes"
              }
            </p>
          </td>
          <td style="padding: 10px; text-align: center;">
            <a href="" id="do-star-toggle-meta" data-type="${
              meta.type
            }" data-id="${meta._id}" style="text-decoration: none;">
              ${meta.me && meta.me.starred ? "&#9733" : "&#9734"}
            </a>
            </br>
            ${meta.stars}
          </td>
        </tr>
      </tbody>
    </table>
  `);
}
function listHelper(where = "body", list = []) {
  if (list.length === 0) {
    $(where).append(
      `<p style="text-align: center;">No questions yet</br>¯\\_(ツ)_/¯</br></p>`
    );
  } else {
    list.forEach(function(meta) {
      appendMetaHeader(where, meta);
    });
  }
}
function appendMetaListByUser(where = "body", username) {
  $.ajax({
    url: `api/users/${username}`,
    method: "GET"
  })
    .done(function(user) {
      listHelper(where, user.metas);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function appendMetaListByQuery(where = "body", query = "top", limit = 3) {
  $(where).append(`<div id="app-${query}-meta-list"></div>`);
  $.ajax({
    url: `api/metas/${query}?` + $.param({ limit }),
    method: "GET"
  })
    .done(function(list) {
      listHelper(`#app-${query}-meta-list`, list);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// User Views
function showUser(username) {
  $.ajax({
    url: `api/users/${username}`,
    method: "GET"
  })
    .done(function(user) {
      $(
        "#app"
      ).html(`<div id="app-user"><fieldset style="border-left-style: none;
      border-right-style: none;
      border-bottom-style: none; padding-bottom: 0px;"><legend>${username}</legend></fieldset>
      <p>Member since ${new Date(user.created).toDateString()}</p>
      <div id="app-${username}-meta-list"></div>
      </div>`);
      listHelper(`#app-${username}-meta-list`, user.metas);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function showDashboard() {
  var username = window.cider.user.username;
  $("#app-links-user").html(`
    Hello, <a id="show-dashboard" href="">${username}</a>
    &nbsp;|&nbsp;
    <a id="do-logout-user" href="">Logout</a>
  `);

  $("#app")
    .html(`<div id="app-dashboard"><fieldset style="border-left-style: none;
    border-right-style: none;
    border-bottom-style: none; padding-bottom: 0px;"><legend>Dashboard</legend></fieldset>
    <div id="app-dashboard-user"></div>
    </div>`);
  appendMetaListByUser("#app-dashboard-user", username);

  $("#app-dashboard").append(`
    <fieldset style="border: 1px solid black; margin-top: 10px;">
      <legend>Discuss</legend>
      <form id="question-form" style="width: 100%; text-align: left;">
          <input id="discussion-title-input" type="text" placeholder="Discussion Title ..." style="margin-bottom: 10px; display: inline-block; width: 100%; box-sizing: border-box;" />
          <textarea id="discussion-body-textarea" style="min-width: 100%; width: 100%; margin: 0px;
          display: block; box-sizing: border-box; padding: 1px; margin-bottom: 10px;" placeholder="Discussion Body ..." />
          <button id="do-crt-discussion" type="submit" style="float: right;">Submit Discussion >></button>
      </form>
    </fieldset>
  `);

  $("#app-dashboard").append(`
    <fieldset style="border: 1px solid black; margin-top: 10px;">
      <legend>Ask</legend>
      <form id="question-form" style="width: 100%; text-align: left;">
          <input id="question-title-input" type="text" placeholder="Question Title ..." style="margin-bottom: 10px; display: inline-block; width: 100%; box-sizing: border-box;" />
          <textarea id="question-body-textarea" style="min-width: 100%; width: 100%; margin: 0px;
          display: block; box-sizing: border-box; padding: 1px; margin-bottom: 10px;" placeholder="Question Body ..." />
          <button id="do-crt-question" type="submit" style="float: right;">Submit Question >></button>
      </form>
    </fieldset>
  `);

  $("#app-dashboard").append(`
    <fieldset style="border: 1px solid black; margin-top: 10px;">
      <legend>Poll</legend>
      <form id="poll-form" style="width: 100%; text-align: left;">
          <input id="poll-title-input" type="text" placeholder="Title" style="margin-bottom: 10px; display: inline-block; width: 100%; box-sizing: border-box;" />
          <div id="poll-options">
            <input data-id="1" id="poll-answer-1-input" type="text" placeholder="Option 1" style="margin-bottom: 10px; display: inline-block; width: 90%; box-sizing: border-box;" />
            <input data-id="2" id="poll-answer-2-input" type="text" placeholder="Option 2" style="margin-bottom: 10px; display: inline-block; width: 90%; box-sizing: border-box;" />
          </div>
          <a href="" id="append-poll-option" style="float:left">+ option</a>
          <button id="do-crt-poll" type="submit" style="float: right;">Submit Poll >></button>
      </form>
    </fieldset>
  `);
}
function showLoginForm() {
  $("#app").html(`
    <form id="login-form" style="width: 100%; text-align: right;">
      <fieldset style="border: 1px solid black;">
        <legend>Login</legend>
        <input id="username-input" type="text" placeholder="username" style="margin-bottom: 10px; display:block; width: 100%; box-sizing: border-box;" />
        <input id="password-input" type="text" placeholder="password" style="margin-bottom: 10px; display:block; width: 100%; box-sizing: border-box;" />
        <button id="do-crt-user" type="button">Register</button>
        <button id="do-login-user" type="submit">Login >></button>
      </fieldset>
    </form>
  `);
}

// Question Views
function showTopMetaList() {
  $("#app").html(`<fieldset style="border-left-style: none;
  border-right-style: none;
  border-bottom-style: none; padding-bottom: 0px;"><legend>Top</legend></fieldset>`);
  appendMetaListByQuery("#app", "top", 3);
}
function showRecentMetaList() {
  $("#app").html(`<fieldset style="border-left-style: none;
  border-right-style: none;
  border-bottom-style: none; padding-bottom: 0px;"><legend>Recent</legend></fieldset>`);
  appendMetaListByQuery("#app", "recent", 10);
}
function showMeta(type, metaId) {
  $.ajax({
    url: `api/${type}s/${metaId}`,
    method: "GET"
  })
    .done(function(meta) {
      $("#app").html(`
      <div id="app">
        <fieldset style="
          border-left-style: none;
          border-right-style: none;
          border-bottom-style: none;
          padding-bottom: 0px;">
      <legend>${type.charAt(0).toUpperCase() + type.slice(1)}</legend>
        </fieldset>
      </div>
      `);
      appendMetaHeader("#app", meta);
      if (type === "discussion") {
        appendDiscussion("#app", meta);
      } else if (type === "question") {
        appendQuestion("#app", meta);
      } else {
        appendPoll("#app", meta);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Question Views
function appendDiscussion(where = "body", discussion) {
  $(where).append(`
    <div id="app-discussion">
      <fieldset style="border: 1px solid black; margin-bottom: 5px;">
        <legend>Response</legend>
          <form id="app-response-form" style="text-align: right;">
          <textarea id="response-body-textarea" style="min-width: 100%; width: 100%; margin: 0px;
          display: block; box-sizing: border-box; padding: 1px; margin-bottom: 10px;" placeholder="Response Body ..." />
            <button data-type="discussion" data-id=${
              discussion._id
            } id="do-del-meta" type="submit">Delete Discussion</button>
              <button data-discussion-id=${
                discussion._id
              } id="do-reply-discussion" type="submit">Submit Response >></button>
          </form>
        </fieldset>
        <div id="app-discussion-responses">
          <!-- append discussion responses here -->
        </div>
    </div>
  `);

  discussion.children.forEach(function(response) {
    appendMetaHeader("#app-discussion-responses", response);
  });
}

// Question Views
function appendQuestion(where = "body", question) {
  $(where).append(`
    <div id="app-question">
      <fieldset style="border: 1px solid black; margin-bottom: 5px;">
        <legend>Answer</legend>
          <form id="app-answer-form" style="text-align: right;">
          <textarea id="answer-body-textarea" style="min-width: 100%; width: 100%; margin: 0px;
          display: block; box-sizing: border-box; padding: 1px; margin-bottom: 10px;" placeholder="Answer Body ..." />
            <button data-type="question" data-id=${
              question._id
            } id="do-del-meta" type="submit">Delete Question</button>
              <button data-question-id=${
                question._id
              } id="do-answer-question" type="submit">Submit Answer >></button>
          </form>
        </fieldset>
        <div id="app-question-answers">
          <!-- append question answers here -->
        </div>
    </div>
  `);

  question.children.forEach(function(answer, i) {
    $("#app-question-answers").append(`
          <table border="1" style="width: 100%; margin-bottom: 5px;">
            <tbody>
              <tr>
                <td style="padding: 10px; text-align: center;">
                  <a href="" id="do-vote-up-answer" data-question-id="${
                    question._id
                  }" data-answer-id="${answer._id}" style="text-decoration: none;">
                    ${
                      question.me &&
                      question.me.voted[answer._id] &&
                      question.me.voted[answer._id] > 0
                        ? "&#9650;"
                        : "&#9651;"
                    }
                  </a>
                    </br>
                    ${answer.bumps}
                    </br>
                  <a href="" id="do-vote-down-answer" data-question-id="${
                    question._id
                  }" data-answer-id="${answer._id}" style="text-decoration: none;">
                    ${
                      question.me &&
                      question.me.voted[answer._id] &&
                      question.me.voted[answer._id] < 0
                        ? "&#9660;"
                        : "&#9661;"
                    }
                  </a>
                </td>
                <td style="padding: 10px;" width="75%">
                  <h3>${answer.content.body}</h3>
                  <p>
                    by <a id="show-user" data-id="${
                      answer.author
                    }" href="">${answer.author}</a>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        `);
  });
}

// Poll Views
function appendPoll(where = "body", poll) {
  $(where).append(`
    <div id="app-poll">
      <fieldset style="border: 1px solid black;">
        <legend>Vote</legend>
        <div id="app-poll-options">
          <!-- append poll options here -->
        </div>
        <form id="poll-form" style="text-align: right;">
          <button data-type="poll" data-id=${
            poll._id
          } id="do-del-meta" type="submit">Delete</button>
          <button data-poll-id=${
            poll._id
          } id="do-vote-option" type="submit">Submit Vote >></button>
        </form>
      </fieldset>
    </div>
  `);

  var totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  poll.options.forEach(function(option, i) {
    var percentage = (totalVotes > 0 ? option.votes / totalVotes : 0) * 100;
    //var barGraph = "/".repeat(Math.floor(percentage * 50));
    $("#app-poll-options").append(`
          <table border="1" style="width: 100%; margin-bottom: 5px;">
            <tbody>
              <tr>
                <td style="padding: 10px; text-align: center;">
                  ${i + 1}.
                </td>
                <td style="padding: 10px;" width="75%">
                  <span>
                    <label for="app-poll-options-${i}">${option.content}</label>
                  </span>
                  </br>
                  <small>
                     ${option.votes} votes | ${percentage} %
                  </small>
                </td>
                <td style="padding: 10px; text-align: center;">
                  <input type="radio" data-option-id="${
                    option._id
                  }" id="app-poll-options-${i}" name="vote" style="padding: 0px; margin: 0px;" ${poll.me && poll.me.voted[option._id] ? "checked" : ""} />
                </td>
              </tr>
            </tbody>
          </table>
        `);
  });
}

// User Actions
function doCrtUser(username = "") {
  $.ajax({
    url: "api/users",
    method: "POST",
    data: {
      username
    }
  })
    .done(function() {
      appendAlert(`Successfully created ${username} account!`);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doLoginUser(username = "") {
  $.ajax({
    url: `api/users/me?` + $.param({ login: username }),
    method: "PUT"
  })
    .done(function(user) {
      window.cider = { user };
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doLogoutUser() {
  $.ajax({
    url: `api/users/me?logout`,
    method: "PUT"
  })
    .done(function(user, result) {
      window.cider = undefined;
      $("#app-links-user").html(`
        <a href="" id="show-login-form">Login</a>
      `);
      appendAlert("Successfully logged out.");
      showLoginForm();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Meta Actions
function doStarToggleMeta(type = "question|poll", metaId) {
  $.ajax({
    url: `api/${type}s/${metaId}?star`,
    method: "PUT"
  })
    .done(function() {
      if ($("#app-top-meta-list").length) {
        showTopMetaList();
      } else if ($("#app-recent-meta-list").length) {
        showRecentMetaList();
      } else if ($("#app-dashboard").length) {
        showDashboard();
      } else if ($("#app-user").length) {
        showUser($("#app-user legend").text());
      } else {
        showMeta(type, metaId);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doBumpMeta(type = "question|poll", metaId, bump = "up|down") {
  $.ajax({
    url: `api/${type}s/${metaId}?` + $.param({ bump }),
    method: "PUT"
  })
    .done(function() {
      if ($("#app-top-meta-list").length) {
        showTopMetaList();
      } else if ($("#app-recent-meta-list").length) {
        showRecentMetaList();
      } else if ($("#app-dashboard").length) {
        showDashboard();
      } else if ($("#app-user").length) {
        showUser($("#app-user legend").text());
      } else {
        showMeta(type, metaId);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doDelMeta(type = "question|poll", metaId) {
  $.ajax({
    url: `api/${type}s/${metaId}`,
    method: "DELETE"
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Discussion Actions
function doCrtDiscussion(title, body) {
  $.ajax({
    url: `api/discussions`,
    method: "POST",
    data: {
      title,
      body
    }
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doReplyDiscussion(discussionId, body) {
  $.ajax({
    url: `api/discussions/${discussionId}?reply`,
    method: "PUT",
    data: {
      body
    }
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Question Actions
function doCrtQuestion(title, body) {
  $.ajax({
    url: `api/questions`,
    method: "POST",
    data: {
      title,
      body
    }
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doAnswerQuestion(questionId, body) {
  $.ajax({
    url: `api/questions/${questionId}?answer`,
    method: "PUT",
    data: {
      body
    }
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doVoteAnswer(questionId, answerId, vote = "up|down") {
  var query = `${vote}Vote`;
  var params = {};
  params[query] = answerId;
  $.ajax({
    url: `api/questions/${questionId}?` + $.param(params),
    method: "PUT"
  })
    .done(function() {
      showMeta("question", questionId);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Poll Actions
function doCrtPoll(title, body, options) {
  $.ajax({
    url: `api/polls`,
    method: "POST",
    data: {
      title,
      body,
      options
    }
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doVoteOption(pollId, optionId) {
  $.ajax({
    url: `api/polls/${pollId}?` + $.param({ vote: optionId }),
    method: "PUT"
  })
    .done(function() {
      showMeta("poll", pollId);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Nav Events
$("body").delegate("#show-top-meta-list", "click", function(e) {
  e.preventDefault();
  var metaId = e.target.dataset.id;
  showTopMetaList(metaId);
});
$("body").delegate("#show-recent-meta-list", "click", function(e) {
  e.preventDefault();
  var metaId = e.target.dataset.id;
  showRecentMetaList(metaId);
});

// Other Events
$("body").delegate("#show-login-form", "click", function(e) {
  e.preventDefault();
  showLoginForm(e.target.dataset.id);
});
$("body").delegate("#show-dashboard", "click", function(e) {
  e.preventDefault();
  showDashboard();
});
$("body").delegate("#show-user", "click", function(e) {
  e.preventDefault();
  showUser(e.target.dataset.id);
});
$("body").delegate("#show-meta", "click", function(e) {
  e.preventDefault();
  var type = e.target.dataset.type;
  var metaId = e.target.dataset.id;
  showMeta(type, metaId);
});

// User Events
$("body").delegate("#do-crt-user", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var username = $("#username-input").val();
  if (username === "") {
    flag = 1;
    appendAlert("invalid username");
  }
  if (!flag) {
    doCrtUser(username);
    $("#username-input").val("");
  }
});
$("body").delegate("#do-login-user", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var username = $("#username-input").val();
  if (username === "") {
    flag = 1;
    appendAlert("invalid username");
  }
  if (!flag) {
    doLoginUser(username);
    $("#username-input").val("");
  }
});
$("body").delegate("#do-logout-user", "click", function(e) {
  e.preventDefault();
  doLogoutUser();
});

// Meta Events
$("body").delegate("#do-star-toggle-meta", "click", function(e) {
  e.preventDefault();
  var type = e.target.dataset.type;
  doStarToggleMeta(type, e.target.dataset.id);
});
$("body").delegate("#do-bump-up-meta", "click", function(e) {
  e.preventDefault();
  var type = e.target.dataset.type;
  doBumpMeta(type, e.target.dataset.id, "up");
});
$("body").delegate("#do-bump-down-meta", "click", function(e) {
  e.preventDefault();
  var type = e.target.dataset.type;
  doBumpMeta(type, e.target.dataset.id, "down");
});
$("body").delegate("#do-del-meta", "click", function(e) {
  e.preventDefault();
  var type = e.target.dataset.type;
  doDelMeta(type, e.target.dataset.id);
});

// Discussion Events
$("body").delegate("#do-crt-discussion", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var title = $("#discussion-title-input").val();
  var body = $("#discussion-body-textarea").val();
  if (!title || title === "") {
    flag = 1;
    appendAlert("invalid discussion title");
  }
  if (!body || body === "") {
    flag = 1;
    appendAlert("invalid discussion body");
  }
  if (!flag) {
    doCrtDiscussion(title, body);
  }
});
$("body").delegate("#do-reply-discussion", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var discussionId = e.target.dataset.discussionId;
  var body = $("#response-body-textarea").val();
  if (!body || body === "") {
    flag = 1;
    appendAlert("invalid discussion input");
  }
  if (!flag) {
    doReplyDiscussion(discussionId, body);
    $("#response-body-textarea").val("");
  }
});

// Question Events
$("body").delegate("#do-crt-question", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var title = $("#question-title-input").val();
  var body = $("#question-body-textarea").val();
  if (!title || title === "") {
    flag = 1;
    appendAlert("invalid question title");
  }
  if (!body || body === "") {
    flag = 1;
    appendAlert("invalid question body");
  }
  if (!flag) {
    doCrtQuestion(title, body);
  }
});
$("body").delegate("#do-answer-question", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var questionId = e.target.dataset.questionId;
  var body = $("#answer-body-textarea").val();
  if (!body || body === "") {
    flag = 1;
    appendAlert("invalid answer input");
  }
  if (!flag) {
    doAnswerQuestion(questionId, body);
    $("#answer-body-textarea").val("");
  }
});
$("body").delegate("#do-vote-up-answer", "click", function(e) {
  e.preventDefault();
  var questionId = e.target.dataset.questionId;
  var answerId = e.target.dataset.answerId;
  doVoteAnswer(questionId, answerId, "up");
});
$("body").delegate("#do-vote-down-answer", "click", function(e) {
  e.preventDefault();
  var questionId = e.target.dataset.questionId;
  var answerId = e.target.dataset.answerId;
  doVoteAnswer(questionId, answerId, "down");
});

// Poll Events
$("body").delegate("#do-crt-poll", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var title = $("#poll-title-input").val();
  var body; // todo
  var options = [];
  $("#poll-options > input").each(function() {
    if (this.value && this.value != "") options.push(this.value);
  });
  if (!title || title === "") {
    flag = 1;
    appendAlert("invalid poll title");
  }
  if (options.length < 2) {
    flag = 1;
    appendAlert("minimum two options");
  }
  if (!flag) {
    doCrtPoll(title, body, options);
  }
});
$("body").delegate("#do-vote-option", "click", function(e) {
  e.preventDefault();
  var pollId = e.target.dataset.pollId;
  var selected = $("input[name=vote]:checked");
  var optionId = selected[0].dataset.optionId;
  var flag = 0;
  if (!selected.length) {
    flag = 1;
    appendAlert("no selection");
  }
  if (!flag) {
    doVoteOption(pollId, optionId);
  }
});
$("body").delegate("#append-poll-option", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var answers = $("#poll-answers > input");
  if (answers.length === 5) {
    flag = 1;
    appendAlert("exceeded max answers");
  }
  var idxs = [];
  answers.each(function() {
    idxs.push(parseInt(this.dataset.id, 10));
  });
  idxs.sort();
  var minIdx = idxs[idxs.length - 1] + 1;
  // note: findMinIdx has lgn solution with binary search
  for (var i = 1; i < idxs.length; i++) {
    if (idxs[i] - idxs[i - 1] > 1) {
      minIdx = idxs[i - 1] + 1;
      break;
    }
  }
  if (!flag) {
    $("#poll-options").append(`
      <input data-id="${minIdx}" id="poll-options-${minIdx}-input" type="text" placeholder="Option ${minIdx}" style="margin-bottom: 10px; display: inline-block; width: 90%; box-sizing: border-box;" />
      <a href="" id="remove-poll-options-${minIdx}" style="text-decoration: none;">&#10005;</a>
    `);
    $("body").delegate(`#remove-poll-options-${minIdx}`, "click", function(e) {
      e.preventDefault();
      $(`#poll-options-${minIdx}-input`).remove();
      $("body").undelegate(`#remove-poll-options-${minIdx}`, "click");
      $(`#remove-poll-options-${minIdx}`).remove();
    });
  }
});

$(function() {
  // try to get the current user with the session cookie
  $.ajax({
    url: `api/users/me`,
    method: "GET"
  })
    .done(function(user) {
      window.cider = { user };
      // todo consolidate with loginUser()
      showDashboard();
    })
    .fail(function() {
      showTopMetaList();
    });
});
