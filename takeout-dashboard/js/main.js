// TABS
// grab the tab buttons and the sections they show
var tabButtons = document.querySelectorAll(".tab-btn");
var tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(function(button) {
  button.addEventListener("click", function() {

    // un-highlight every button first
    tabButtons.forEach(function(btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    });
    // then highlight the one that was clicked
    this.classList.add("active");
    this.setAttribute("aria-pressed", "true");

    // show the matching section and hide the rest
    var tab = this.getAttribute("data-tab");
    tabPanels.forEach(function(panel) {
      panel.hidden = panel.id !== tab;
    });
  });
});


// HELPERS

// look up a library card user by their ID
function findUser(userId) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === userId) {
      return users[i];
    }
  }
  return null;
}

// turn a status into a little colored tag
function statusTag(status) {
  var tagClass = "tag-available";
  if (status === "Checked out") {
    tagClass = "tag-out";
  } else if (status === "In processing") {
    tagClass = "tag-processing";
  } else if (status === "Retired") {
    tagClass = "tag-retired";
  }
  return '<span class="tag ' + tagClass + '">' + status + '</span>';
}

// look up a container by its ID
function findContainer(containerId) {
  for (var i = 0; i < containers.length; i++) {
    if (containers[i].id === containerId) {
      return containers[i];
    }
  }
  return null;
}

// a container ID you can click to open its history
function idButton(containerId) {
  return '<button class="id-btn" data-id="' + containerId + '" aria-haspopup="dialog">' + containerId + '</button>';
}

// only containers staff have in hand can be retired
function canRetire(c) {
  return c.status === "Available" || c.status === "In processing";
}

// ask first, then pull the container out of circulation.
// this is only in memory, so it resets when the page reloads
function retireContainer(containerId) {
  if (!confirm("Retire " + containerId + "? This removes it from circulation.")) return;

  var c = findContainer(containerId);
  c.status = "Retired";
  c.location = "Removed from circulation";
  c.track = "None";
  c.condition = "Retired";

  showOverview();
  showContainers();
}

// tell screen reader users how many rows the filters left.
// the status line is hidden on screen, see .visually-hidden in the css
function announceCount(statusId, count, noun) {
  var word = count === 1 ? noun : noun + "s";
  document.getElementById(statusId).textContent = count + " " + word + " shown";
}

// a row that spans the whole table when nothing matches the filters
function noResultsRow(columns) {
  return '<tr><td class="no-results" colspan="' + columns + '">No matches. Try changing the filters.</td></tr>';
}

// find every overdue library card container.
// a container can be checked out more than once, so only its latest checkout counts.
// returns a list like [{ container: "C-04817", userId: "U-223", dueBy: "2026-03-15" }]
function getOverdue() {
  var overdue = [];

  containers.forEach(function(c) {
    if (c.status === "Checked out" && c.track === "Library Card") {
      var latest = null;
      transactions.forEach(function(t) {
        if (t.container === c.id && t.event === "Checkout") {
          if (latest === null || t.dateTime > latest.dateTime) {
            latest = t;
          }
        }
      });

      if (latest && latest.dueBy < TODAY) {
        overdue.push({ container: c.id, userId: latest.userId, dueBy: latest.dueBy });
      }
    }
  });

  return overdue;
}

// check if one container or one user shows up in the overdue list
function isContainerOverdue(containerId) {
  return getOverdue().some(function(item) {
    return item.container === containerId;
  });
}

function isUserOverdue(userId) {
  return getOverdue().some(function(item) {
    return item.userId === userId;
  });
}


// OVERVIEW

document.getElementById("today-date").textContent = TODAY;

function showOverview() {
  // count containers by status
  var outCount = 0;
  var processingCount = 0;
  var availableCount = 0;
  var retiredCount = 0;

  containers.forEach(function(container) {
    if (container.status === "Checked out") {
      outCount++;
    } else if (container.status === "In processing") {
      // returned but not restocked yet: waiting for pickup, washing, or on the way back
      processingCount++;
    } else if (container.status === "Available") {
      availableCount++;
    } else if (container.status === "Retired") {
      retiredCount++;
    }
  });

  // retired containers are no longer in circulation
  document.getElementById("stat-circulation").textContent = containers.length - retiredCount;
  document.getElementById("stat-out").textContent = outCount;
  document.getElementById("stat-processing").textContent = processingCount;
  document.getElementById("stat-available").textContent = availableCount;
  document.getElementById("stat-retired").textContent = retiredCount;


  // overdue library card returns
  var overdueHTML = "";
  getOverdue().forEach(function(item) {
    var user = findUser(item.userId);
    overdueHTML += "<li><strong>" + item.container + "</strong> " + user.name + " (" + item.userId + "), due " + item.dueBy + "</li>";
  });

  if (overdueHTML === "") {
    overdueHTML = "<li>Nothing overdue right now.</li>";
  }
  document.getElementById("overdue-list").innerHTML = overdueHTML;


  // containers at or over the use threshold that still need a decision.
  // "inspected" gets set when the admin chooses to keep one in service
  var thresholdHTML = "";
  containers.forEach(function(c) {
    if (c.timesReused >= USE_THRESHOLD && c.status !== "Retired" && !c.inspected) {
      var buttons = '<button class="keep-btn" data-id="' + c.id + '" aria-label="Keep in service, ' + c.id + '">Keep in service</button>';
      if (canRetire(c)) {
        buttons += ' <button class="retire-btn" data-id="' + c.id + '" aria-label="Retire ' + c.id + '">Retire</button>';
      }

      thresholdHTML += "<li>" +
        '<span class="row-text"><strong>' + c.id + "</strong> " + c.timesReused + " uses, " + c.location + "</span>" +
        buttons +
        "</li>";
    }
  });

  if (thresholdHTML === "") {
    thresholdHTML = "<li>Nothing to inspect right now.</li>";
  }
  document.getElementById("threshold-list").innerHTML = thresholdHTML;
}

// keep or retire buttons on the 30+ list
document.getElementById("threshold-list").addEventListener("click", function(event) {
  var id = event.target.getAttribute("data-id");
  if (!id) return;

  if (event.target.classList.contains("keep-btn")) {
    findContainer(id).inspected = true;
    showOverview();
  } else if (event.target.classList.contains("retire-btn")) {
    retireContainer(id);
  }

  // the clicked button is gone now, so move focus to the next one left in the list
  var nextButton = document.querySelector("#threshold-list button");
  if (nextButton) {
    nextButton.focus();
  }
});

// clicking a number opens the Containers tab, filtered to that status
document.querySelectorAll(".stat").forEach(function(card) {
  card.addEventListener("click", function() {
    // clear the other filters so the count matches what shows up
    containerSearch.value = "";
    containerLocation.value = "all";
    containerOverdue.checked = false;
    containerStatus.value = this.getAttribute("data-status");
    showContainers();

    // reuse the tab button so the highlight moves too.
    // the card we clicked is now hidden, so move keyboard focus to that tab
    var containersTab = document.querySelector('.tab-btn[data-tab="containers"]');
    containersTab.click();
    containersTab.focus();
  });
});


// most checkouts by restaurant
// checkouts show demand, so this ranking is what clean containers get distributed by.
// this only depends on the transactions, so it only needs to run once
var locationCounts = {};

transactions.forEach(function(t) {
  if (t.event === "Checkout") {
    if (locationCounts[t.location]) {
      locationCounts[t.location]++;
    } else {
      locationCounts[t.location] = 1;
    }
  }
});

// sort so the busiest location is on top
var locations = Object.keys(locationCounts).sort(function(a, b) {
  return locationCounts[b] - locationCounts[a];
});
var highest = locationCounts[locations[0]];

var locationHTML = "";
locations.forEach(function(name, i) {
  var width = (locationCounts[name] / highest) * 100;
  var label = locationCounts[name] === 1 ? " checkout" : " checkouts";
  locationHTML += "<li>" +
    "<span>" + (i + 1) + ". " + name + "</span>" +
    '<span class="bar" style="width: ' + width + '%" aria-hidden="true"></span>' +
    '<span class="bar-count">' + locationCounts[name] + label + "</span>" +
    "</li>";
});
document.getElementById("location-list").innerHTML = locationHTML;


// CONTAINERS TABLE

var containerSearch = document.getElementById("container-search");
var containerStatus = document.getElementById("container-status");
var containerLocation = document.getElementById("container-location");
var containerOverdue = document.getElementById("container-overdue");

function showContainers() {
  var search = containerSearch.value.trim().toUpperCase();
  var status = containerStatus.value;
  var location = containerLocation.value;
  var overdueOnly = containerOverdue.checked;

  var html = "";
  var count = 0;
  containers.forEach(function(c) {
    var overdue = isContainerOverdue(c.id);

    // skip any row that doesn't match the filters
    if (search !== "" && c.id.indexOf(search) === -1) return;
    if (status === "circulation" && c.status === "Retired") return;
    if (status !== "all" && status !== "circulation" && c.status !== status) return;
    if (location !== "all" && c.location !== location) return;
    if (overdueOnly && !overdue) return;

    var statusCell = statusTag(c.status);
    if (overdue) {
      statusCell += '<span class="tag tag-overdue">Overdue</span>';
    }

    var action = "None";
    if (canRetire(c)) {
      action = '<button class="retire-btn" data-id="' + c.id + '" aria-label="Retire ' + c.id + '">Retire</button>';
    }

    count++;
    html += "<tr>" +
      "<td>" + idButton(c.id) + "</td>" +
      "<td>" + statusCell + "</td>" +
      "<td>" + c.location + "</td>" +
      "<td>" + c.timesReused + "</td>" +
      "<td>" + c.track + "</td>" +
      "<td>" + c.entered + "</td>" +
      "<td>" + c.condition + "</td>" +
      "<td>" + action + "</td>" +
      "</tr>";
  });

  if (html === "") {
    html = noResultsRow(8);
  }
  document.getElementById("containers-body").innerHTML = html;
  announceCount("containers-status", count, "container");
}

// re-draw the table whenever a filter changes
containerSearch.addEventListener("input", showContainers);
containerStatus.addEventListener("change", showContainers);
containerLocation.addEventListener("change", showContainers);
containerOverdue.addEventListener("change", showContainers);


// RETIRE A CONTAINER
// the buttons get re-drawn with the table, so listen on the table body instead of each button
document.getElementById("containers-body").addEventListener("click", function(event) {
  if (event.target.classList.contains("retire-btn")) {
    retireContainer(event.target.getAttribute("data-id"));
  }
});


// TRANSACTIONS TABLE

var transactionSearch = document.getElementById("transaction-search");
var transactionEvent = document.getElementById("transaction-event");
var transactionTrack = document.getElementById("transaction-track");
var transactionLocation = document.getElementById("transaction-location");

// copy the array and sort it so the newest scan shows first
var newestFirst = transactions.slice().sort(function(a, b) {
  return a.dateTime < b.dateTime ? 1 : -1;
});

function showTransactions() {
  var search = transactionSearch.value.trim().toUpperCase();
  var eventType = transactionEvent.value;
  var track = transactionTrack.value;
  var location = transactionLocation.value;

  var html = "";
  var count = 0;
  newestFirst.forEach(function(t) {
    if (search !== "" && t.container.indexOf(search) === -1) return;
    if (eventType !== "all" && t.event !== eventType) return;
    if (track !== "all" && t.track !== track) return;
    if (location !== "all" && t.location !== location) return;

    count++;
    html += "<tr>" +
      "<td>" + t.id + "</td>" +
      "<td>" + idButton(t.container) + "</td>" +
      "<td>" + t.event + "</td>" +
      "<td>" + t.dateTime + "</td>" +
      "<td>" + t.location + "</td>" +
      "<td>" + t.track + "</td>" +
      "<td>" + t.userId + "</td>" +
      "<td>" + t.token + "</td>" +
      "<td>" + t.deposit + "</td>" +
      "<td>" + t.dueBy + "</td>" +
      "</tr>";
  });

  if (html === "") {
    html = noResultsRow(10);
  }
  document.getElementById("transactions-body").innerHTML = html;
  announceCount("transactions-status", count, "scan");
}

transactionSearch.addEventListener("input", showTransactions);
transactionEvent.addEventListener("change", showTransactions);
transactionTrack.addEventListener("change", showTransactions);
transactionLocation.addEventListener("change", showTransactions);


// LIBRARY CARD USERS TABLE

var userSearch = document.getElementById("user-search");
var userSort = document.getElementById("user-sort");
var userOverdue = document.getElementById("user-overdue");

function showUsers() {
  var search = userSearch.value.trim().toLowerCase();
  var overdueOnly = userOverdue.checked;

  // sort a copy by sign-up date, newest or oldest first
  var sorted = users.slice().sort(function(a, b) {
    if (userSort.value === "oldest") {
      return a.signUp > b.signUp ? 1 : -1;
    }
    return a.signUp < b.signUp ? 1 : -1;
  });

  var html = "";
  var count = 0;
  sorted.forEach(function(u) {
    var overdue = isUserOverdue(u.id);

    // search matches either the name or the user ID
    var matches = u.name.toLowerCase().indexOf(search) !== -1 || u.id.toLowerCase().indexOf(search) !== -1;
    if (!matches) return;
    if (overdueOnly && !overdue) return;

    var outCell = u.containersOut + " of 2";
    if (overdue) {
      outCell += '<span class="tag tag-overdue">Overdue</span>';
    }

    count++;
    html += "<tr>" +
      "<td>" + u.id + "</td>" +
      "<td>" + u.name + "</td>" +
      '<td><a href="mailto:' + u.email + '">' + u.email + "</a></td>" +
      "<td>" + u.phone + "</td>" +
      "<td>" + outCell + "</td>" +
      "<td>" + u.signUp + "</td>" +
      "</tr>";
  });

  if (html === "") {
    html = noResultsRow(6);
  }
  document.getElementById("users-body").innerHTML = html;
  announceCount("users-status", count, "user");
}

userSearch.addEventListener("input", showUsers);
userSort.addEventListener("change", showUsers);
userOverdue.addEventListener("change", showUsers);


// CONTAINER HISTORY POPUP
// every scan for one container, oldest first, so it reads like a timeline

var historyDialog = document.getElementById("history-dialog");

function showHistory(containerId) {
  var c = findContainer(containerId);
  document.getElementById("history-title").textContent = "Container " + c.id;
  // checked out and retired containers aren't at a restaurant, so skip the location for them
  var where = "";
  if (c.status === "Available" || c.status === "In processing") {
    where = " at " + c.location;
  }
  document.getElementById("history-summary").textContent =
    c.status + where + ". Reused " + c.timesReused + " times. In service since " + c.entered + ".";

  // pull out this container's scans and put them in date order
  var scans = transactions.filter(function(t) {
    return t.container === containerId;
  }).sort(function(a, b) {
    return a.dateTime > b.dateTime ? 1 : -1;
  });

  var html = "";
  // same columns as the Transactions tab, minus Container ID since it's in the title
  scans.forEach(function(t) {
    html += "<tr>" +
      "<td>" + t.id + "</td>" +
      "<td>" + t.event + "</td>" +
      "<td>" + t.dateTime + "</td>" +
      "<td>" + t.location + "</td>" +
      "<td>" + t.track + "</td>" +
      "<td>" + t.userId + "</td>" +
      "<td>" + t.token + "</td>" +
      "<td>" + t.deposit + "</td>" +
      "<td>" + t.dueBy + "</td>" +
      "</tr>";
  });

  if (html === "") {
    html = '<tr><td class="no-results" colspan="9">No scans in this period.</td></tr>';
  }
  document.getElementById("history-body").innerHTML = html;

  historyDialog.showModal();
}

// container IDs show up in more than one table, so listen on the whole page
document.addEventListener("click", function(event) {
  if (event.target.classList.contains("id-btn")) {
    showHistory(event.target.getAttribute("data-id"));
  }
});

// close with the X, or by clicking the dark area outside the popup.
// the Esc key already closes a dialog on its own
document.getElementById("history-close").addEventListener("click", function() {
  historyDialog.close();
});

historyDialog.addEventListener("click", function(event) {
  if (event.target === historyDialog) {
    historyDialog.close();
  }
});


// draw everything once when the page loads
showOverview();
showContainers();
showTransactions();
showUsers();
