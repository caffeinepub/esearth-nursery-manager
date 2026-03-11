import Text "mo:core/Text";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Data model types
  public type UserProfile = {
    name : Text;
    role : Text; // "owner" or "clerk"
  };

  public type ChecklistItem = {
    id : Nat;
    title : Text;
    completed : Bool;
    date : Text;
    category : Text;
  };

  public type Task = {
    id : Nat;
    title : Text;
    description : Text;
    priority : Text;
    status : Text;
    dueDate : Text;
    assignedTo : Text; // "owner" | "clerk" | "all"
    createdAt : Text;
    completedAt : Text;
  };

  // Storage
  let userProfiles = Map.empty<Principal, UserProfile>();
  let dailyChecklist = Map.empty<Nat, ChecklistItem>();
  let tasks = Map.empty<Nat, Task>();

  // Generic shared data store (key -> JSON string)
  // Used for inventory, sales, expenditures, stock movements, priority tasks
  let sharedDataStore = Map.empty<Text, Text>();

  var nextDailyChecklistId = 1;
  var nextTaskId = 1;
  var lowStockThreshold = 10;
  var invoiceCounter = 1;

  /************
   * Profiles *
   ************/
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  /*****************
   * Checklist     *
   *****************/
  public shared ({ caller }) func addChecklistItem(title : Text, date : Text, category : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add checklist items");
    };
    let item : ChecklistItem = {
      id = nextDailyChecklistId;
      title;
      completed = false;
      date;
      category;
    };
    dailyChecklist.add(nextDailyChecklistId, item);
    nextDailyChecklistId += 1;
    item.id;
  };

  public shared ({ caller }) func toggleChecklistItem(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    switch (dailyChecklist.get(id)) {
      case (null) { Runtime.trap("Item not found") };
      case (?item) {
        let updatedItem : ChecklistItem = {
          id = item.id;
          title = item.title;
          completed = not item.completed;
          date = item.date;
          category = item.category;
        };
        dailyChecklist.add(id, updatedItem);
      };
    };
  };

  public shared ({ caller }) func deleteChecklistItem(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete checklist items");
    };
    switch (dailyChecklist.get(id)) {
      case (null) { Runtime.trap("Checklist item not found") };
      case (?_) { dailyChecklist.remove(id) };
    };
  };

  public query ({ caller }) func getChecklistItemsByDate(date : Text) : async [ChecklistItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view checklist items");
    };
    dailyChecklist.values().toArray().filter(func(item) { item.date == date });
  };

  public shared ({ caller }) func resetChecklistForNewDay(date : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reset checklist");
    };
    let itemsForDate = dailyChecklist.values().toArray().filter(func(item) { item.date == date });
    for (item in itemsForDate.values()) {
      let updatedItem : ChecklistItem = {
        id = item.id;
        title = item.title;
        completed = false;
        date = item.date;
        category = item.category;
      };
      dailyChecklist.add(item.id, updatedItem);
    };
  };

  /********************
   * Low Stock        *
   ********************/
  public shared ({ caller }) func saveLowStockThreshold(value : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update low stock threshold");
    };
    lowStockThreshold := value;
  };

  public query ({ caller }) func getLowStockThreshold() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view low stock threshold");
    };
    lowStockThreshold;
  };

  /******************************
   * Task Management           *
   ******************************/
  public shared ({ caller }) func addTask(
    title : Text,
    description : Text,
    priority : Text,
    dueDate : Text,
    assignedTo : Text
  ) : async Nat {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add tasks");
    };
    let task : Task = {
      id = nextTaskId;
      title;
      description;
      priority;
      status = "pending";
      dueDate;
      assignedTo;
      createdAt = "now";
      completedAt = "";
    };
    tasks.add(nextTaskId, task);
    nextTaskId += 1;
    task.id;
  };

  public shared ({ caller }) func updateTask(
    id : Nat,
    title : Text,
    description : Text,
    priority : Text,
    dueDate : Text,
    assignedTo : Text,
    status : Text,
  ) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update tasks");
    };
    switch (tasks.get(id)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        let updatedTask : Task = {
          id = task.id;
          title;
          description;
          priority;
          status;
          dueDate;
          assignedTo;
          createdAt = task.createdAt;
          completedAt = task.completedAt;
        };
        tasks.add(id, updatedTask);
      };
    };
  };

  public shared ({ caller }) func deleteTask(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete tasks");
    };
    switch (tasks.get(id)) {
      case (null) { Runtime.trap("Task not found") };
      case (?_) { tasks.remove(id) };
    };
  };

  public shared ({ caller }) func completeTask(id : Nat) : async () {
    // Any user can complete tasks (no authorization check needed)
    switch (tasks.get(id)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        let completedTask : Task = {
          id = task.id;
          title = task.title;
          description = task.description;
          priority = task.priority;
          status = "completed";
          dueDate = task.dueDate;
          assignedTo = task.assignedTo;
          createdAt = task.createdAt;
          completedAt = "now";
        };
        tasks.add(id, completedTask);
      };
    };
  };

  public query func getTasks() : async [Task] {
    // Any user can view tasks (no authorization check needed)
    tasks.values().toArray();
  };

  public query func getTasksByAssignee(assignedTo : Text) : async [Task] {
    // Any user can view tasks (no authorization check needed)
    tasks.values().toArray().filter(func(task) { task.assignedTo == assignedTo });
  };

  /***************************
   * Invoice Counter        *
   ***************************/
  public shared func getNextInvoiceNumber() : async Nat {
    // Any user including guests can get invoice numbers (no authorization check needed)
    let currentNumber = invoiceCounter;
    invoiceCounter += 1;
    currentNumber;
  };

  public query func getCurrentInvoiceCounter() : async Nat {
    // Any user including guests can view invoice counter (no authorization check needed)
    invoiceCounter;
  };

  /***********************************
   * Shared Data Store              *
   * Generic key-value JSON storage *
   * for inventory, sales, etc.     *
   ***********************************/
  public shared func setSharedData(key : Text, value : Text) : async () {
    // No auth check - all devices with app access can read/write shared data
    sharedDataStore.add(key, value);
  };

  public query func getSharedData(key : Text) : async ?Text {
    // No auth check - all devices with app access can read shared data
    sharedDataStore.get(key);
  };
};
