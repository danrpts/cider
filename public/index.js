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
function isPoll(question) {
  return (
    question.answers &&
    question.answers.length > 0 &&
    question.answers.reduce(
      (bool, answer) => bool && answer.author === question.author,
      true
    )
  );
}
function appendAlert(msg) {
  var $el = $(`<li style="width: 100%; border:">${msg}</li>`);
  $el.appendTo("#alerts");
  setTimeout(function() {
    $el.remove();
  }, 2000);
}
function appendQuestionHeader(where = "body", question = undefined) {
  $(where).append(`
    <table border="1" style="width: 100%; margin-bottom: 5px;">
      <tbody>
        <tr>
          <td style="padding: 10px; text-align: center;">
            <a href="" id="do-bump-up-question" data-id="${
              question._id
            }" style="text-decoration: none;">
              ${question.me && question.me.bumped > 0 ? "&#9650;" : "&#9651;"}
            </a>
              </br>
              ${question.bumps}
              </br>
            <a href="" id="do-bump-down-question" data-id="${
              question._id
            }" style="text-decoration: none;">
              ${question.me && question.me.bumped < 0 ? "&#9660;" : "&#9661;"}
            </a>
          </td>
          <td style="padding: 10px;" width="75%">
            <h3>
            <a href="" id="show-question" data-id="${question._id}">${
    question.title
  }</a>
            </h3>
            <p>
              by <a id="show-user" data-id="${question.author}" href="">${
    question.author
  }</a>
              ${timeSince(Date.parse(question.created))} ago
              </br>
              ${
                question.type === "poll"
                  ? question.answers.reduce(
                      (sum, answer) => sum + answer.votes,
                      0
                    ) + " votes"
                  : question.answers.length + " answers"
              }
            </p>
          </td>
          <td style="padding: 10px; text-align: center;">
            <a href="" id="do-star-question" data-id="${
              question._id
            }" style="text-decoration: none;">
              ${question.me && question.me.starred ? "&#9733" : "&#9734"}
            </a>
            </br>
            ${question.stars}
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
    list.forEach(function(question) {
      appendQuestionHeader(where, question);
    });
  }
}
function appendQuestionListByUser(where = "body", username) {
  $(where).append(`<div id="app-${username}-question-list"></div>`);
  $.ajax({
    url: `api/users/${username}/questions`,
    method: "GET"
  })
    .done(function(list) {
      listHelper(`#app-${username}-question-list`, list);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function appendQuestionListByQuery(where = "body", query = "top", limit = 3) {
  $(where).append(`<div id="app-${query}-question-list"></div>`);
  $.ajax({
    url: `api/questions/${query}?` + $.param({ limit }),
    method: "GET"
  })
    .done(function(list) {
      listHelper(`#app-${query}-question-list`, list);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// User Views
function showUser(username) {
  $("#app").html(`<div id="app-user"><fieldset style="border-left-style: none;
  border-right-style: none;
  border-bottom-style: none; padding-bottom: 0px;"><legend>${username}</legend></fieldset></div>`);
  appendQuestionListByUser("#app-user", username);
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
    border-bottom-style: none; padding-bottom: 0px;"><legend>Dashboard</legend></fieldset></div>`);
  appendQuestionListByUser("#app-dashboard", username);

  $("#app-dashboard").append(`
    <fieldset style="border: 1px solid black; margin-top: 10px;">
      <legend>Ask</legend>
      <form id="question-form" style="width: 100%; text-align: left;">
          <input id="question-title-input" type="text" placeholder="Question" style="margin-bottom: 10px; display: inline-block; width: 100%; box-sizing: border-box;" />
          <button id="do-crt-question" type="submit" style="float: right;">Submit Question >></button>
      </form>
    </fieldset>
  `);

  $("#app-dashboard").append(`
    <fieldset style="border: 1px solid black; margin-top: 10px;">
      <legend>Poll</legend>
      <form id="poll-form" style="width: 100%; text-align: left;">
          <input id="poll-title-input" type="text" placeholder="Title" style="margin-bottom: 10px; display: inline-block; width: 100%; box-sizing: border-box;" />
          <div id="poll-answers">
            <input data-id="1" id="poll-answer-1-input" type="text" placeholder="Option 1" style="margin-bottom: 10px; display: inline-block; width: 90%; box-sizing: border-box;" />
            <input data-id="2" id="poll-answer-2-input" type="text" placeholder="Option 2" style="margin-bottom: 10px; display: inline-block; width: 90%; box-sizing: border-box;" />
          </div>
          <a href="" id="append-poll-answer" style="float:left">+ option</a>
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
function showTopQuestionList() {
  $("#app").html(`<fieldset style="border-left-style: none;
  border-right-style: none;
  border-bottom-style: none; padding-bottom: 0px;"><legend>Top</legend></fieldset>`);
  appendQuestionListByQuery("#app", "top", 3);
}
function showRecentQuestionList() {
  $("#app").html(`<fieldset style="border-left-style: none;
  border-right-style: none;
  border-bottom-style: none; padding-bottom: 0px;"><legend>Recent</legend></fieldset>`);
  appendQuestionListByQuery("#app", "recent", 10);
}
function showQuestion(questionId) {
  $.ajax({
    url: `api/questions/${questionId}`,
    method: "GET"
  })
    .done(function(question) {
      $("#app").html(`
      <div id="app">
        <fieldset style="
          border-left-style: none;
          border-right-style: none;
          border-bottom-style: none;
          padding-bottom: 0px;">
      <legend>${question.type.charAt(0).toUpperCase() +
        question.type.slice(1)}</legend>
        </fieldset>
      </div>
      `);
      appendQuestionHeader("#app", question);
      if (question.type === "poll") {
        appendPoll("#app", question);
      } else {
        appendDiscussion("#app", question);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Question Views
function appendDiscussion(where = "body", question) {
  $(where).append(`
  <div id="app-question">

  <fieldset style="border: 1px solid black;  margin-bottom: 5px;">
    <legend>Answer</legend>

      <form id="app-question-answer-form" style="text-align: right;">

        <textarea id="answer-input" style="min-width: 100%; width: 100%; margin: 0px;
      display: block;
      box-sizing: border-box; padding: 1px; margin-bottom: 10px;" placeholder="Answer"></textarea>
          <button data-id=${
            question._id
          } id="do-del-question" type="submit">Delete Question</button>
          <button data-id=${
            question._id
          } id="do-crt-answer" type="submit">Submit Answer >></button>
      </form>

    </fieldset>

    <div id="app-question-answers">
      <!-- append question answers here -->
    </div>

  </div>
  `);

  question.answers.forEach(function(answer, i) {
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
                    ${answer.votes}
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
                  <h3>${answer.content}</h3>
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
function appendPoll(where = "body", question) {
  $(where).append(`

    <div id="app-poll">

      <fieldset style="border: 1px solid black;">
        <legend>Vote</legend>

        <div id="app-poll-answers">
          <!-- append poll answers here -->
        </div>

        <form id="poll-form" style="text-align: right;">
          <button data-id=${
            question._id
          } id="do-del-question" type="submit">Delete</button>
          <button data-id=${
            question._id
          } id="do-vote-poll" type="submit">Submit Vote >></button>
        </form>

      </fieldset>

    </div>
    `);

  var totalVotes = question.answers.reduce(
    (sum, answer) => sum + answer.votes,
    0
  );

  question.answers.forEach(function(answer, i) {
    var percentage = (totalVotes > 0 ? answer.votes / totalVotes : 0) * 100;
    //var barGraph = "/".repeat(Math.floor(percentage * 50));
    $("#app-poll-answers").append(`
          <table border="1" style="width: 100%; margin-bottom: 5px;">
            <tbody>
              <tr>
                <td style="padding: 10px; text-align: center;">
                  ${i + 1}.
                </td>
                <td style="padding: 10px;" width="75%">
                  <span>
                    <label for="app-poll-answers-${i}">${answer.content}</label>
                  </span>
                  </br>
                  <small>
                     ${answer.votes} votes | ${percentage} %
                  </small>
                </td>
                <td style="padding: 10px; text-align: center;">
                  <input type="radio" data-id="${
                    answer._id
                  }" id="app-poll-answers-${i}" name="vote" style="padding: 0px; margin: 0px;" />
                </td>
              </tr>
            </tbody>
          </table>
        `);
  });
}

// Question Actions
function doCrtAnswer(questionId = "", answer = "") {
  $.ajax({
    url: `api/answers`,
    method: "POST",
    data: {
      questionId,
      content: answer
    }
  })
    .done(function() {
      showQuestion(questionId);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

// Question Actions
function doCrtQuestion(title = "", answers = []) {
  var data = {
    title
  };
  if (answers.length > 0) {
    data.answers = answers;
  }
  $.ajax({
    url: "api/questions",
    method: "POST",
    data
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doDelQuestion(questionId = "") {
  $.ajax({
    url: `api/questions/${questionId}`,
    method: "DELETE"
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doStarQuestion(questionId = "", star = "") {
  $.ajax({
    url: `api/questions/${questionId}?star`,
    method: "PUT"
  })
    .done(function() {
      if ($("#app-top-question-list").length) {
        showTopQuestionList();
      } else if ($("#app-recent-question-list").length) {
        showRecentQuestionList();
      } else if ($("#app-dashboard").length) {
        showDashboard();
      } else if ($("#app-user").length) {
        showUser($("#app-user legend").text());
      } else {
        showQuestion(questionId);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doBumpQuestion(questionId = "", bump = "") {
  $.ajax({
    url: `api/questions/${questionId}?` + $.param({ bump }),
    method: "PUT"
  })
    .done(function() {
      if ($("#app-top-question-list").length) {
        showTopQuestionList();
      } else if ($("#app-recent-question-list").length) {
        showRecentQuestionList();
      } else if ($("#app-dashboard").length) {
        showDashboard();
      } else if ($("#app-user").length) {
        showUser($("#app-user legend").text());
      } else {
        showQuestion(questionId);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doVoteAnswer(questionId = "", answerId = "", vote = "") {
  $.ajax({
    url: `api/answers/${answerId}?` + $.param({ vote }),
    method: "PUT"
  })
    .done(function() {
      showQuestion(questionId);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doVotePoll(questionId = "", answerId = "") {
  $.ajax({
    url: `api/answers/${answerId}?vote`,
    method: "PUT",
    data: {
      question: questionId
    }
  })
    .done(function() {
      showQuestion(questionId);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
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

// Event Handlers
$("body").delegate("#show-top-question-list", "click", function(e) {
  e.preventDefault();
  showTopQuestionList(e.target.dataset.id);
});
$("body").delegate("#show-recent-question-list", "click", function(e) {
  e.preventDefault();
  showRecentQuestionList(e.target.dataset.id);
});
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
$("body").delegate("#show-question", "click", function(e) {
  e.preventDefault();
  showQuestion(e.target.dataset.id);
});
$("body").delegate("#append-poll-answer", "click", function(e) {
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
    $("#poll-answers").append(`
      <input data-id="${minIdx}" id="poll-answer-${minIdx}-input" type="text" placeholder="Option ${minIdx}" style="margin-bottom: 10px; display: inline-block; width: 90%; box-sizing: border-box;" />
      <a href="" id="remove-poll-answer-${minIdx}" style="text-decoration: none;">&#10005;</a>
    `);
    $("body").delegate(`#remove-poll-answer-${minIdx}`, "click", function(e) {
      e.preventDefault();
      $(`#poll-answer-${minIdx}-input`).remove();
      $("body").undelegate(`#remove-poll-answer-${minIdx}`, "click");
      $(`#remove-poll-answer-${minIdx}`).remove();
    });
  }
});

$("body").delegate("#do-crt-question", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var title = $("#question-title-input").val();
  if (!title || title === "") {
    flag = 1;
    appendAlert("invalid question title");
  }
  if (!flag) {
    doCrtQuestion(title);
  }
});
$("body").delegate("#do-del-question", "click", function(e) {
  e.preventDefault();
  var id = e.target.dataset.id;
  doDelQuestion(e.target.dataset.id);
});
$("body").delegate("#do-bump-up-question", "click", function(e) {
  e.preventDefault();
  doBumpQuestion(e.target.dataset.id, "up");
});
$("body").delegate("#do-bump-down-question", "click", function(e) {
  e.preventDefault();
  doBumpQuestion(e.target.dataset.id, "down");
});
$("body").delegate("#do-star-question", "click", function(e) {
  e.preventDefault();
  doStarQuestion(e.target.dataset.id);
});

$("body").delegate("#do-crt-answer", "click", function(e) {
  e.preventDefault();
  var answer = $("#answer-input").val();
  var flag = 0;
  if (!answer || answer === "") {
    flag = 1;
    appendAlert("invalid answer input");
  }
  if (!flag) {
    doCrtAnswer(e.target.dataset.id, answer);
    $("input #answer-input").val("");
  }
});
$("body").delegate("#do-vote-up-answer", "click", function(e) {
  e.preventDefault();
  doVoteAnswer(e.target.dataset.questionId, e.target.dataset.answerId, "up");
});
$("body").delegate("#do-vote-down-answer", "click", function(e) {
  e.preventDefault();
  doVoteAnswer(e.target.dataset.questionId, e.target.dataset.answerId, "down");
});

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

$("body").delegate("#do-crt-poll", "click", function(e) {
  e.preventDefault();
  var flag = 0;
  var title = $("#poll-title-input").val();
  var answers = [];
  $("#poll-answers > input").each(function() {
    if (this.value && this.value != "") answers.push(this.value);
  });
  if (!title || title === "") {
    flag = 1;
    appendAlert("invalid poll title");
  }
  if (answers.length < 2) {
    flag = 1;
    appendAlert("minimum two options");
  }
  if (!flag) {
    doCrtQuestion(title, answers);
  }
});
$("body").delegate("#do-vote-poll", "click", function(e) {
  e.preventDefault();
  var selected = $("input[name=vote]:checked");
  var flag = 0;
  if (!selected.length) {
    flag = 1;
    appendAlert("no selection");
  }
  if (!flag) {
    doVotePoll(e.target.dataset.id, selected[0].dataset.id, "up");
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
      showTopQuestionList();
    });
});
