// sample data for the prototype
// in the real system this comes from the SQL database.
// each array below is one of the three tables from the data model spreadsheet.
// rows from the original spreadsheet are kept, with a few added around them.

// the date the dashboard pretends it is
var TODAY = "2026-03-16";

// a container gets flagged for inspection once it reaches this many uses
var USE_THRESHOLD = 30;

// container lifecycle, every change comes from a scan at a restaurant terminal:
// checkout scan -> "Checked out"
// return scan   -> "In processing" (waiting for pickup, being washed, or on its way back)
// restock scan  -> "Available" again, at the restaurant it was restocked at
// "Retired" can happen at any point
// pickups are Tuesdays and Thursdays. clean containers go back to the restaurant
// they were picked up from, swapped in at a later stop, so a restock is always
// at the same restaurant as the return before it.


// TABLE 1: CONTAINERS
// one row per physical container, updated in place
var containers = [
  { id: "C-04812", status: "In processing", location: "Savas",                    timesReused: 12, track: "None",          entered: "2026-01-15", condition: "Good" },
  { id: "C-04813", status: "Available",     location: "Savas",                    timesReused: 8,  track: "None",          entered: "2026-01-15", condition: "Good" },
  { id: "C-04814", status: "In processing", location: "Mani",                     timesReused: 34, track: "None",          entered: "2026-01-15", condition: "Good" },
  { id: "C-04815", status: "Retired",       location: "Removed from circulation", timesReused: 3,  track: "None",          entered: "2026-02-01", condition: "Retired" },
  { id: "C-04816", status: "Checked out",   location: "None",                      timesReused: 11, track: "Library Card", entered: "2026-01-15", condition: "Good" },
  { id: "C-04817", status: "Checked out",   location: "None",                      timesReused: 7,  track: "Library Card", entered: "2026-02-01", condition: "Good" },
  { id: "C-04818", status: "Checked out",   location: "None",                      timesReused: 5,  track: "Library Card", entered: "2026-02-01", condition: "Good" },
  { id: "C-04819", status: "Available",     location: "Gandy Dancer",             timesReused: 31, track: "None",          entered: "2026-01-15", condition: "Good" },
  { id: "C-04820", status: "Available",     location: "Savas",                    timesReused: 6,  track: "None",          entered: "2026-02-01", condition: "Good" },
  { id: "C-04821", status: "Available",     location: "Mani",                     timesReused: 14, track: "None",          entered: "2026-01-15", condition: "Good" },
  { id: "C-04822", status: "Available",     location: "Gandy Dancer",             timesReused: 2,  track: "None",          entered: "2026-03-01", condition: "Good" },
  { id: "C-04901", status: "Checked out",   location: "None",                      timesReused: 9,  track: "Library Card", entered: "2026-01-15", condition: "Good" }
];


// TABLE 2: TRANSACTIONS
// one row per scan (checkout, return, or restock). rows only ever get added, never changed.
// deposit rows have a payment token but no user. library card rows have a user but no token.
// restock rows are just the container coming back clean, so they have neither.
var transactions = [
  { id: "T-100001", container: "C-04812", event: "Checkout", dateTime: "2026-03-01 18:22", location: "Savas",        track: "Deposit",      userId: "None",   token: "48217", deposit: "$3.00",  dueBy: "None" },
  { id: "T-100005", container: "C-04817", event: "Checkout", dateTime: "2026-03-01 19:20", location: "Gandy Dancer", track: "Library Card", userId: "U-223", token: "None",        deposit: "None",   dueBy: "2026-03-15" },
  { id: "T-100006", container: "C-04813", event: "Checkout", dateTime: "2026-03-02 12:40", location: "Mani",         track: "Deposit",      userId: "None",   token: "61538", deposit: "$3.00",  dueBy: "None" },
  { id: "T-100003", container: "C-04901", event: "Checkout", dateTime: "2026-03-02 19:05", location: "Gandy Dancer", track: "Library Card", userId: "U-221", token: "None",        deposit: "None",   dueBy: "2026-03-16" },
  { id: "T-100007", container: "C-04813", event: "Return",   dateTime: "2026-03-03 19:25", location: "Savas",        track: "Deposit",      userId: "None",   token: "61538", deposit: "None",   dueBy: "None" },
  { id: "T-100002", container: "C-04812", event: "Return",   dateTime: "2026-03-04 12:10", location: "Mani",         track: "Deposit",      userId: "None",   token: "48217", deposit: "None",   dueBy: "None" },
  { id: "T-100009", container: "C-04819", event: "Checkout", dateTime: "2026-03-04 18:40", location: "Gandy Dancer", track: "Deposit",      userId: "None",   token: "85042", deposit: "$3.00",  dueBy: "None" },
  { id: "T-100010", container: "C-04819", event: "Return",   dateTime: "2026-03-06 20:15", location: "Gandy Dancer", track: "Deposit",      userId: "None",   token: "85042", deposit: "None",   dueBy: "None" },
  { id: "T-100011", container: "C-04821", event: "Checkout", dateTime: "2026-03-06 13:05", location: "Savas",        track: "Deposit",      userId: "None",   token: "39276", deposit: "$3.00",  dueBy: "None" },
  { id: "T-100012", container: "C-04821", event: "Return",   dateTime: "2026-03-08 11:50", location: "Mani",         track: "Deposit",      userId: "None",   token: "39276", deposit: "None",   dueBy: "None" },
  { id: "T-100004", container: "C-04901", event: "Return",   dateTime: "2026-03-09 08:40", location: "Mani",         track: "Library Card", userId: "U-221", token: "None",        deposit: "None",   dueBy: "2026-03-16" },
  { id: "T-100008", container: "C-04812", event: "Restock",  dateTime: "2026-03-10 09:20", location: "Mani",         track: "None",          userId: "None",   token: "None",        deposit: "None",   dueBy: "None" },
  { id: "T-100018", container: "C-04813", event: "Restock",  dateTime: "2026-03-10 10:05", location: "Savas",        track: "None",          userId: "None",   token: "None",        deposit: "None",   dueBy: "None" },
  { id: "T-100019", container: "C-04812", event: "Checkout", dateTime: "2026-03-10 13:47", location: "Mani",         track: "Deposit",      userId: "None",   token: "73950", deposit: "$3.00",  dueBy: "None" },
  { id: "T-100020", container: "C-04816", event: "Checkout", dateTime: "2026-03-11 18:50", location: "Savas",        track: "Library Card", userId: "U-221", token: "None",        deposit: "None",   dueBy: "2026-03-25" },
  { id: "T-100022", container: "C-04901", event: "Restock",  dateTime: "2026-03-12 09:30", location: "Mani",         track: "None",          userId: "None",   token: "None",        deposit: "None",   dueBy: "None" },
  { id: "T-100023", container: "C-04821", event: "Restock",  dateTime: "2026-03-12 09:35", location: "Mani",         track: "None",          userId: "None",   token: "None",        deposit: "None",   dueBy: "None" },
  { id: "T-100024", container: "C-04819", event: "Restock",  dateTime: "2026-03-12 10:40", location: "Gandy Dancer", track: "None",          userId: "None",   token: "None",        deposit: "None",   dueBy: "None" },
  { id: "T-100026", container: "C-04812", event: "Return",   dateTime: "2026-03-12 17:30", location: "Savas",        track: "Deposit",      userId: "None",   token: "73950", deposit: "None",   dueBy: "None" },
  { id: "T-100027", container: "C-04814", event: "Checkout", dateTime: "2026-03-13 12:30", location: "Savas",        track: "Deposit",      userId: "None",   token: "26184", deposit: "$3.00",  dueBy: "None" },
  { id: "T-100028", container: "C-04814", event: "Return",   dateTime: "2026-03-14 13:10", location: "Mani",         track: "Deposit",      userId: "None",   token: "26184", deposit: "None",   dueBy: "None" },
  { id: "T-100029", container: "C-04818", event: "Checkout", dateTime: "2026-03-14 18:05", location: "Gandy Dancer", track: "Library Card", userId: "U-224", token: "None",        deposit: "None",   dueBy: "2026-03-28" },
  { id: "T-100021", container: "C-04901", event: "Checkout", dateTime: "2026-03-15 12:15", location: "Mani",         track: "Library Card", userId: "U-223", token: "None",        deposit: "None",   dueBy: "2026-03-29" }
];


// TABLE 3: LIBRARY CARD USERS
// one row per resident. the only table with personal info.
// containersOut is what the terminal checks to enforce the two-container limit.
var users = [
  { id: "U-221", name: "Maya Chen",     email: "maya.chen@email.com",  phone: "734-555-0142", containersOut: 1, signUp: "2026-02-10" },
  { id: "U-222", name: "James Okafor",  email: "j.okafor@email.com",   phone: "734-555-0198", containersOut: 0, signUp: "2026-02-12" },
  { id: "U-223", name: "Priya Nair",    email: "priya.n@email.com",    phone: "734-555-0176", containersOut: 2, signUp: "2026-02-20" },
  { id: "U-224", name: "Sam Whitfield", email: "swhitfield@email.com", phone: "734-555-0121", containersOut: 1, signUp: "2026-03-03" },
  { id: "U-225", name: "Leah Brooks",   email: "leah.b@email.com",     phone: "734-555-0165", containersOut: 0, signUp: "2026-03-05" },
  { id: "U-226", name: "Omar Haddad",   email: "ohaddad@email.com",    phone: "734-555-0187", containersOut: 0, signUp: "2026-03-09" }
];
