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

function appendAlert(msg) {
  var $el = $(`<li style="width: 100%; border:">${msg}</li>`);
  $el.appendTo("#app-alerts");
  setTimeout(function() {
    $el.remove();
  }, 2000);
}
function userPostListHelper(where = "body", list = []) {
  if (list.length === 0) {
    $(where).append("¯\\_(ツ)_/¯");
  } else {
    list.forEach(function(post, i) {
      $(where).append(
        `
          <tr style="margin-bottom: 5px;">
            <td style="text-align: center;">
              ${i + 1}.
            </td>
            <td style="padding: 0px; padding-left: 5px;">
              <span>
              <a href="" id="show-post-link" data-id="${post._id}">${
          post.title
        }</a>
              </span>
              </br>
              <small>
                ${timeSince(Date.parse(post.created))} ago | ${
          post.meta.voters.length
        } votes | ${post.meta.stars.length} stars | ${
          post.meta.bumps.sum
        } points
              </small>
            </td>
          </tr>
          `
      );
    });
  }
}
function postListHelper(where = "body", list = []) {
  if (list.length === 0) {
    $(where).append("¯\\_(ツ)_/¯");
  } else {
    list.forEach(function(post, i) {
      var perms = {
        isUser: window.cider && window.cider.user,
        isOwner: false,
        hasVoted: false,
        hasStarred: false,
        hasBumppedUp: false,
        hasBumppedDown: false
      };
      if (perms.isUser) {
        let user = window.cider.user;
        perms.isOwner = post.author._id === user._id;
        perms.hasVoted = post.meta.voters.indexOf(user._id) > -1;
        perms.hasStarred = post.meta.stars.indexOf(user._id) > -1;
        perms.hasBumppedUp = post.meta.bumps.up.indexOf(user._id) > -1;
        perms.hasBumppedDown = post.meta.bumps.down.indexOf(user._id) > -1;
      }
      $(where).append(`
        <tr>
          <td style="text-align: center;">
            <a href="" id="do-bump-up-post-link" data-id="${
              post._id
            }" style="text-decoration: none;">
              ${perms.hasBumppedUp ? "&#9650;" : "&#9651;"}
            </a>
              </br>
              ${post.meta.bumps.sum}
              </br>
            <a href="" id="do-bump-down-post-link" data-id="${
              post._id
            }" style="text-decoration: none;">
              ${perms.hasBumppedDown ? "&#9660;" : "&#9661;"}
            </a>
          </td>
          <td style="padding: 0px; padding-left: 5px;">
            <span><a href="" id="show-post-link" data-id="${post._id}">
            ${post.title}
            </a>
            </span>
            </br>
            <small>
              by <a id="show-user-link" data-id="${
                post.author.username
              }" href="">${post.author.username}</a>
              ${timeSince(Date.parse(post.created))} ago
              | ${post.meta.voters.length} votes
            </small>
          </td>
          <td style="text-align: center;">
            <a href="" id="do-star-post-link" data-id="${
              post._id
            }" style="text-decoration: none;">
              ${perms.hasStarred ? "&#9733" : "&#9734"}
            </a>
            </br>
            ${post.meta.stars.length}
          </td>
        </tr>
      `);
    });
  }
}
function appendUserPostList(where = "body", username) {
  $(where).append(`
    <table border="1" style="width: 100%; margin-bottom: 5px;">
      <tbody id="app-content-post-list-${username}">
      </tbody>
    </table>
  `);
  $.ajax({
    url: `http://localhost:8080/api/users/${username}/posts`,
    method: "GET"
  })
    .done(function(list) {
      userPostListHelper(`#app-content-post-list-${username}`, list);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function appendPostList(where = "body", query = "top", limit = 3) {
  $(where).append(`
    <table border="1" style="width: 100%; margin-bottom: 5px;">
      <tbody id="app-content-post-list-${query}">
      </tbody>
    </table>
  `);
  $.ajax({
    url: `http://localhost:8080/api/posts/${query}?` + $.param({ limit }),
    method: "GET"
  })
    .done(function(list) {
      postListHelper(`#app-content-post-list-${query}`, list);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function appendPost(where = "body") {}

function showTopPostsList() {
  $("#app-content").html("<h3>Top</h3>");
  appendPostList("#app-content", "top", 3);
}
function showNewPostsList() {
  $("#app-content").html("<h3>Recent</h3>");
  appendPostList("#app-content", "recent", 10);
}
function showUser(username) {
  $("#app-content").html(`<h3>${username}</h3>`);
  appendUserPostList("#app-content", username);
}
function showPost(postId) {
  $.ajax({
    url: `http://localhost:8080/api/posts/${postId}`,
    method: "GET"
  })
    .done(function(post) {
      var totalVotes = post.meta.voters.length;
      var totalStars = post.meta.stars.length;
      var perms = {
        isUser: window.cider && window.cider.user,
        isOwner: false,
        hasVoted: false,
        hasStarred: false,
        hasBumppedUp: false,
        hasBumppedDown: false
      };
      if (perms.isUser) {
        let user = window.cider.user;
        perms.isOwner = post.author._id === user._id;
        perms.hasVoted = post.meta.voters.indexOf(user._id) > -1;
        perms.hasStarred = post.meta.stars.indexOf(user._id) > -1;
        perms.hasBumppedUp = post.meta.bumps.up.indexOf(user._id) > -1;
        perms.hasBumppedDown = post.meta.bumps.down.indexOf(user._id) > -1;
      }
      $("#app-content").html(`<div id="app-content-post"></div>`);
      var deleteButton = `<button data-id=${
        post._id
      } id="do-delete-post-button" type="submit">Delete Post</button>`;
      var voteButton = `<button data-id=${
        post._id
      } id="do-vote-post-button" type="submit">Submit Vote</button>`;
      var items = post.items.reduce(function(str, item) {
        var perc = totalVotes > 0 ? item.votes / totalVotes : 0;
        var fillCount = Math.floor(perc * 50);
        var bar = perc * 100 + "%&nbsp;" + "/".repeat(fillCount);
        return (
          str +
          `
          <tr>
            <td style="text-align: center;">
              <input type="radio" data-id="${item._id}" id="option-${
            item._id
          }" name="vote" style="margin: 0px;">
            </td>
            <td style="padding: 0px; padding-left: 5px; padding-top: 10px;">
              <label for="option-${item._id}">${item.content}</label>
              ${item.votes} votes
              </br>
              ${bar}
            </td>
          </tr>
          `
        );
      }, "");
      $("#app-content-post").html(`
        <table border="1" style="width: 100%; margin-bottom: 5px;">
          <tbody>
            <tr>
              <td style="text-align: center;">
                <a href="" id="do-bump-up-post-button" data-id="${
                  post._id
                }" style="text-decoration: none;">
                  ${perms.hasBumppedUp ? "&#9650;" : "&#9651;"}
                </a>
                  </br>
                  ${post.meta.bumps.sum}
                  </br>
                <a href="" id="do-bump-down-post-button" data-id="${
                  post._id
                }" style="text-decoration: none;">
                  ${perms.hasBumppedDown ? "&#9660;" : "&#9661;"}
                </a>
              </td>
              <td style="padding: 0px; padding-left: 5px;">
                <span>
                ${post.title}
                </span>
                </br>
                <small>
                  by <a id="show-user-link" data-id="${
                    post.author.username
                  }" href="">${post.author.username}</a>
                  ${timeSince(Date.parse(post.created))} ago
                </small>
              </td>
              <td style="text-align: center;">
                <a href="" id="do-star-post-link" data-state="${
                  perms.hasStarred
                }" data-id="${post._id}" style="text-decoration: none;">
                  ${perms.hasStarred ? "&#9733" : "&#9734"}
                </a>
                </br>
                ${post.meta.stars.length}
              </td>
            </tr>
          </tbody>
        </table>
        <table style="width: 100%; margin-bottom: 5px;">
          <tbody>${items}</tbody>
        </table>
        <form id="post-form" style="text-align: right;">
          ${perms.isOwner ? deleteButton : ""}
          ${
            !perms.isUser || perms.isOwner
              ? ""
              : perms.hasVoted ? "You have voted." : voteButton
          }
        </form>
        `);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function showDashboard() {
  var username = window.cider.user.username;
  $("#app-links-user").html(`
    Hello, <a id="show-dashboard-link" href="">${username}</a>
    &nbsp;|&nbsp;
    <a id="do-logout-user-link" href="">Logout</a>
    `);
  showUser(username);
  $("#app-content").append(`
    <h3>Post</h3>
    <form id="user-form" style="text-align: center;">
      <input id="post-title-input" type="text" placeholder="title" style="margin-bottom: 10px;" />
      <input id="post-option1-input" type="text" placeholder="option 1" style="margin-bottom: 10px;" />
      <input id="post-option2-input" type="text" placeholder="option 2" style="margin-bottom: 10px;" />
      </br>
      <button id="do-create-post-button" type="submit" style="width: 100px;">Create Post</button>
    </form>
  `);
}
function showLoginForm() {
  $("#app-content").html("<h3>Login</h3>");
  $("#app-content").append(`
    <form id="login-form" style="text-align: center;">
      <input id="username-input" type="text" placeholder="username" style="margin-bottom: 10px;" />
      <input id="password-input" type="text" placeholder="password" style="margin-bottom: 10px;" />
      </br>
      <button id="do-create-user-button"type="button">Register</button>
      <button id="do-login-user-button" type="submit">Login ></button>
    </form>
  `);
}

function doStarPost(postId, star) {
  $.ajax({
    url: `http://localhost:8080/api/posts/${postId}?star`,
    method: "PUT"
  })
    .done(function() {
      if ($("#app-content-post-list-top").length) {
        showTopPostsList();
      } else if ($("#app-content-post-list-new").length) {
        showNewPostsList();
      } else {
        showPost(postId);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doBumpPost(postId, bump) {
  $.ajax({
    url: `http://localhost:8080/api/posts/${postId}?` + $.param({ bump }),
    method: "PUT"
  })
    .done(function() {
      if ($("#app-content-post-list-top").length) {
        showTopPostsList();
      } else if ($("#app-content-post-list-new").length) {
        showNewPostsList();
      } else {
        showPost(postId);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doDeletePost(postId) {
  $.ajax({
    url: `http://localhost:8080/api/posts/${postId}`,
    method: "DELETE"
  })
    .done(function() {
      showDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doVotePost(postId, itemId) {
  $.ajax({
    url:
      `http://localhost:8080/api/posts/${postId}/${itemId}?` +
      $.param({ vote: true }),
    method: "PUT"
  })
    .done(function() {
      showPost(postId);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}
function doCreatePost() {
  var flag = 0;
  if ($("#post-title-input").val() === "") {
    flag = 1;
    appendAlert("invalid post title");
  }
  if ($("#post-option1-input").val() === "") {
    flag = 1;
    appendAlert("invalid post option 1");
  }
  if ($("#post-option2-input").val() === "") {
    flag = 1;
    appendAlert("invalid post option 2");
  }
  if (!flag) {
    $.ajax({
      url: "http://localhost:8080/api/posts",
      method: "POST",
      data: {
        title: $("#post-title-input").val(),
        items: [$("#post-option1-input").val(), $("#post-option2-input").val()]
      }
    })
      .done(function() {
        $("#post-title-input").val("");
        $("#post-option1-input").val("");
        $("#post-option2-input").val("");
        showDashboard();
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
      });
  }
}
function doCreateUser() {
  var username = $("#username-input").val();
  var flag = 0;
  if (username === "") {
    flag = 1;
    appendAlert("invalid username");
  }
  if (!flag) {
    $.ajax({
      url: "http://localhost:8080/api/users",
      method: "POST",
      data: {
        username
      }
    })
      .done(function() {
        $("#user-input").val("");
        appendAlert(`Successfully created ${username} account!`);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
      });
  }
}
function doLoginUser() {
  var username = $("#username-input").val();
  var flag = 0;
  if (username === "") {
    flag = 1;
    appendAlert("invalid username");
  }
  if (!flag) {
    $.ajax({
      url: `http://localhost:8080/api/users/me?` + $.param({ login: username }),
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
}
function doLogoutUser() {
  $.ajax({
    url: `http://localhost:8080/api/users/me?logout`,
    method: "PUT"
  })
    .done(function(user, result) {
      window.cider = undefined;
      $("#app-links-user").html(`
        <a href="" id="show-login-link">Login</a>
      `);
      appendAlert("Successfully logged out.");
      showLoginForm();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      appendAlert(`${jqXHR.status} ${jqXHR.responseText}`);
    });
}

$("body").delegate("#show-top-posts-link", "click", function(e) {
  e.preventDefault();
  showTopPostsList(e.target.dataset.id);
});
$("body").delegate("#show-new-posts-link", "click", function(e) {
  e.preventDefault();
  showNewPostsList(e.target.dataset.id);
});
$("body").delegate("#show-login-link", "click", function(e) {
  e.preventDefault();
  showLoginForm(e.target.dataset.id);
});
$("body").delegate("#show-dashboard-link", "click", function(e) {
  e.preventDefault();
  showDashboard();
});
$("body").delegate("#show-user-link", "click", function(e) {
  e.preventDefault();
  showUser(e.target.dataset.id);
});
$("body").delegate("#show-post-link", "click", function(e) {
  e.preventDefault();
  showPost(e.target.dataset.id);
});

$("body").delegate("#do-star-post-link", "click", function(e) {
  e.preventDefault();
  doStarPost(e.target.dataset.id);
});
$("body").delegate("#do-bump-up-post-link", "click", function(e) {
  e.preventDefault();
  doBumpPost(e.target.dataset.id, "up");
});
$("body").delegate("#do-bump-down-post-link", "click", function(e) {
  e.preventDefault();
  doBumpPost(e.target.dataset.id, "down");
});
$("body").delegate("#do-delete-post-button", "click", function(e) {
  e.preventDefault();
  var id = e.target.dataset.id;
  doDeletePost(e.target.dataset.id);
});
$("body").delegate("#do-vote-post-button", "click", function(e) {
  e.preventDefault();
  var $checkedEl = $("input[name=vote]:checked");
  if (!$checkedEl.length) {
    appendAlert("no selection");
  } else {
    // todo store item id in data
    doVotePost(e.target.dataset.id, $checkedEl[0].dataset.id);
  }
});
$("body").delegate("#do-create-post-button", "click", function(e) {
  e.preventDefault();
  doCreatePost();
});
$("body").delegate("#do-create-user-button", "click", function(e) {
  e.preventDefault();
  doCreateUser();
});
$("body").delegate("#do-login-user-button", "click", function(e) {
  e.preventDefault();
  doLoginUser();
});
$("body").delegate("#do-logout-user-link", "click", function(e) {
  e.preventDefault();
  doLogoutUser();
});

$(function() {
  // try to get the current user with the session cookie
  $.ajax({
    url: `http://localhost:8080/api/users/me`,
    method: "GET"
  })
    .done(function(user) {
      window.cider = { user };
      // todo consolidate with loginUser()
      showDashboard();
    })
    .fail(function() {
      showTopPostsList();
    });
});
