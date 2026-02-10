import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";

actor {
  let accessControlState = AccessControl.initState();
  include MixinStorage();
  include MixinAuthorization(accessControlState);

  type Platform = { #OneSpan; #ObserveAI; #Freshworks };
  type TicketStatus = { #Submitted; #InProgress; #Resolved };
  type TicketPriority = { #empty; #low; #medium; #high };
  type Brand = { #AMAXTX; #ALPA; #AMAXCA; #VirtualStore };
  type Comment = {
    author : Text;
    content : Text;
    timestamp : Int;
  };

  type Ticket = {
    id : Nat;
    displayName : Text;
    platform : Platform;
    issueDescription : Text;
    officeName : Text;
    agentName : Text;
    employeeId : Text;
    email : Text;
    freshworksEmail : ?Text;
    extension : ?Text;
    brand : Brand;
    policyNumber : ?Text;
    attachments : [Storage.ExternalBlob];
    submissionTime : Int;
    status : TicketStatus;
    comments : [Comment];
    priority : TicketPriority;
  };

  type HelpTopic = {
    id : Nat;
    topicName : Text;
    platform : Platform;
    createdTime : Int;
    modifiedTime : Int;
    explanation : Text;
  };

  type TicketCounter = {
    onespanCounter : Nat;
    observeAICounter : Nat;
    freshworksCounter : Nat;
  };

  type HelpContent = {
    topics : [HelpTopic];
    publishedTime : ?Int;
  };

  type GetTicketsArgs = {
    platformFilter : ?Platform;
    statusFilter : ?TicketStatus;
    brandFilter : ?Brand;
    priorityFilter : ?TicketPriority;
    startDate : ?Int;
    endDate : ?Int;
  };

  type CreateTicketArgs = {
    platform : Platform;
    issueDescription : Text;
    officeName : Text;
    agentName : Text;
    employeeId : Text;
    email : Text;
    freshworksEmail : ?Text;
    extension : ?Text;
    brand : Brand;
    policyNumber : ?Text;
    attachments : [Storage.ExternalBlob];
  };

  type UpdateStatusArgs = {
    ticketId : Nat;
    newStatus : TicketStatus;
  };

  type AddCommentArgs = {
    ticketId : Nat;
    author : Text;
    content : Text;
  };

  type UpdateTicketPriorityArgs = {
    ticketId : Nat;
    newPriority : TicketPriority;
  };

  type PeriodCounts = {
    onespan : Nat;
    observeAI : Nat;
    freshworks : Nat;
    total : Nat;
  };

  type TicketAnalytics = { periods : [(Text, PeriodCounts)] };

  type TicketStatusCounts = {
    submitted : Nat;
    inProgress : Nat;
    resolved : Nat;
    total : Nat;
  };

  type AnalyticsRequest = {
    startTime : Int;
    endTime : Int;
    granularity : Granularity;
  };

  type Granularity = { #day; #week; #month };

  type OldGetTicketsArgs = GetTicketsArgs;

  func formatDate(timestamp : Int) : Text {
    let daysSinceEpoch = timestamp / (24 * 60 * 60 * 1000000000);
    let year = 1970 + (daysSinceEpoch / 365);
    let daysInCurrentYear = (daysSinceEpoch % 365).toNat();
    let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var remainingDays = daysInCurrentYear;
    var month = 0;
    for (days in monthDays.values()) {
      if (remainingDays >= days) {
        remainingDays -= days;
        month += 1;
      };
    };
    let day = remainingDays + 1;
    year.toText() # "-" # month.toText() # "-" # day.toText();
  };

  func getPeriodKey(timestamp : Int, granularity : Granularity) : Text {
    switch (granularity) {
      case (#day) { formatDate(timestamp) };
      case (#week) { formatDate(timestamp) };
      case (#month) { formatDate(timestamp) };
    };
  };

  var nextTopicId : Nat = 1;
  var ticketCounter : TicketCounter = {
    onespanCounter = 1;
    observeAICounter = 1;
    freshworksCounter = 1;
  };

  let tickets = Map.empty<Nat, Ticket>();
  let draftHelpTopics = Map.empty<Nat, HelpTopic>();
  let publishedHelpTopics = Map.empty<Nat, HelpTopic>();

  // Now callable without authentication (except for frontend side UI password check)
  public query ({ caller }) func getTickets(args : GetTicketsArgs) : async [Ticket] {
    let filteredTickets = tickets.values().toArray().filter(
      func(ticket) {
        let platformMatch = switch (args.platformFilter) {
          case (null) { true };
          case (?platform) { platform == ticket.platform };
        };
        let statusMatch = switch (args.statusFilter) {
          case (null) { true };
          case (?status) { status == ticket.status };
        };
        let brandMatch = switch (args.brandFilter) {
          case (null) { true };
          case (?brand) { brand == ticket.brand };
        };
        let priorityMatch = switch (args.priorityFilter) {
          case (null) { true };
          case (?priority) { priority == ticket.priority };
        };
        let dateMatch = switch (args.startDate, args.endDate) {
          case (null, null) { true };
          case (?start, null) { ticket.submissionTime >= start };
          case (null, ?end) { ticket.submissionTime <= end };
          case (?start, ?end) {
            ticket.submissionTime >= start and ticket.submissionTime <= end
          };
        };
        platformMatch and statusMatch and brandMatch and priorityMatch and dateMatch
      }
    );

    let sortedTickets = filteredTickets.sort(
      func(a, b) { Int.compare(b.submissionTime, a.submissionTime) }
    );
    sortedTickets;
  };

  // Now callable without authentication (except for frontend side UI password check)
  public query ({ caller }) func getTicket(ticketId : Nat) : async ?Ticket {
    tickets.get(ticketId);
  };

  // New backend implementation
  // Now callable without authentication (except for frontend side UI password check)
  public query ({ caller }) func searchTickets(searchTerm : Text) : async [Ticket] {
    let normalizedSearchTerm = searchTerm.toLower();
    let filteredTickets = tickets.values().toArray().filter(
      func(ticket) {
        let normalizedDisplayName = ticket.displayName.toLower();
        let matchesDisplayName = normalizedDisplayName.contains(#text normalizedSearchTerm);
        let matchesComments = ticket.comments.find(
          func(comment) {
            let normalizedCommentContent = comment.content.toLower();
            let normalizedAuthor = comment.author.toLower();
            normalizedCommentContent.contains(#text normalizedSearchTerm) or normalizedAuthor.contains(#text normalizedSearchTerm);
          }
        );
        let normalizedIssueDescription = ticket.issueDescription.toLower();
        let matchesIssueDescription = normalizedIssueDescription.contains(#text normalizedSearchTerm);
        let normalizedOfficeName = ticket.officeName.toLower();
        let matchesOfficeName = normalizedOfficeName.contains(#text normalizedSearchTerm);
        let normalizedAgentName = ticket.agentName.toLower();
        let matchesAgentName = normalizedAgentName.contains(#text normalizedSearchTerm);
        let normalizedEmployeeId = ticket.employeeId.toLower();
        let matchesEmployeeId = normalizedEmployeeId.contains(#text normalizedSearchTerm);
        let normalizedEmail = ticket.email.toLower();
        let matchesEmail = normalizedEmail.contains(#text normalizedSearchTerm);
        let matchesFreshworksEmail = switch (ticket.freshworksEmail) {
          case (?fwEmail) {
            let normalizedFWEmail = fwEmail.toLower();
            normalizedFWEmail.contains(#text normalizedSearchTerm);
          };
          case (null) { false };
        };
        matchesDisplayName or matchesComments != null or matchesIssueDescription or matchesOfficeName or matchesAgentName or matchesEmployeeId or matchesEmail or matchesFreshworksEmail;
      }
    );
    filteredTickets;
  };

  // Now callable without authentication (always public Help Center view)
  public query ({ caller }) func getHelpTopics() : async [HelpTopic] {
    publishedHelpTopics.values().toArray();
  };

  // No access control per specification requirement
  public query ({ caller }) func getHelpTopicsDraft() : async [HelpTopic] {
    draftHelpTopics.values().toArray();
  };

  // Now callable without authentication (except for frontend side UI password check)
  public shared ({ caller }) func updateTicketStatus(args : UpdateStatusArgs) : async () {
    switch (tickets.get(args.ticketId)) {
      case (null) { Runtime.trap("Ticket not found") };
      case (?ticket) {
        let updatedTicket : Ticket = {
          id = ticket.id;
          displayName = ticket.displayName;
          platform = ticket.platform;
          issueDescription = ticket.issueDescription;
          officeName = ticket.officeName;
          agentName = ticket.agentName;
          employeeId = ticket.employeeId;
          email = ticket.email;
          freshworksEmail = ticket.freshworksEmail;
          extension = ticket.extension;
          brand = ticket.brand;
          policyNumber = ticket.policyNumber;
          attachments = ticket.attachments;
          submissionTime = ticket.submissionTime;
          status = args.newStatus;
          comments = ticket.comments;
          priority = ticket.priority;
        };
        tickets.add(ticket.id, updatedTicket);
      };
    };
  };

  // Now callable without authentication (except for frontend side UI password check)
  public shared ({ caller }) func updateTicketPriority(args : UpdateTicketPriorityArgs) : async () {
    switch (tickets.get(args.ticketId)) {
      case (null) { Runtime.trap("Ticket not found") };
      case (?ticket) {
        let updatedTicket : Ticket = {
          id = ticket.id;
          displayName = ticket.displayName;
          platform = ticket.platform;
          issueDescription = ticket.issueDescription;
          officeName = ticket.officeName;
          agentName = ticket.agentName;
          employeeId = ticket.employeeId;
          email = ticket.email;
          freshworksEmail = ticket.freshworksEmail;
          extension = ticket.extension;
          brand = ticket.brand;
          policyNumber = ticket.policyNumber;
          attachments = ticket.attachments;
          submissionTime = ticket.submissionTime;
          status = ticket.status;
          comments = ticket.comments;
          priority = args.newPriority;
        };
        tickets.add(args.ticketId, updatedTicket);
      };
    };
  };

  // Now callable without authentication (except for frontend side UI password check)
  public shared ({ caller }) func addComment(args : AddCommentArgs) : async () {
    switch (tickets.get(args.ticketId)) {
      case (null) { Runtime.trap("Ticket not found") };
      case (?ticket) {
        let newComment : Comment = {
          author = args.author;
          content = args.content;
          timestamp = Time.now();
        };
        let updatedTicket : Ticket = {
          id = ticket.id;
          displayName = ticket.displayName;
          platform = ticket.platform;
          issueDescription = ticket.issueDescription;
          officeName = ticket.officeName;
          agentName = ticket.agentName;
          employeeId = ticket.employeeId;
          email = ticket.email;
          freshworksEmail = ticket.freshworksEmail;
          extension = ticket.extension;
          brand = ticket.brand;
          policyNumber = ticket.policyNumber;
          attachments = ticket.attachments;
          submissionTime = ticket.submissionTime;
          status = ticket.status;
          comments = ticket.comments.concat([newComment]);
          priority = ticket.priority;
        };
        tickets.add(ticket.id, updatedTicket);
      };
    };
  };

  // Always public
  public shared ({ caller }) func submitTicket(args : CreateTicketArgs) : async Nat {
    let displayName = switch (args.platform) {
      case (#OneSpan) {
        let name = "OS-" # ticketCounter.onespanCounter.toText();
        ticketCounter := {
          onespanCounter = ticketCounter.onespanCounter + 1;
          observeAICounter = ticketCounter.observeAICounter;
          freshworksCounter = ticketCounter.freshworksCounter;
        };
        name;
      };
      case (#ObserveAI) {
        let name = "OAI-" # ticketCounter.observeAICounter.toText();
        ticketCounter := {
          onespanCounter = ticketCounter.onespanCounter;
          observeAICounter = ticketCounter.observeAICounter + 1;
          freshworksCounter = ticketCounter.freshworksCounter;
        };
        name;
      };
      case (#Freshworks) {
        let name = "FW-" # ticketCounter.freshworksCounter.toText();
        ticketCounter := {
          onespanCounter = ticketCounter.onespanCounter;
          observeAICounter = ticketCounter.observeAICounter;
          freshworksCounter = ticketCounter.freshworksCounter + 1;
        };
        name;
      };
    };
    let ticketId = tickets.size();
    let newTicket : Ticket = {
      id = ticketId;
      displayName;
      platform = args.platform;
      issueDescription = args.issueDescription;
      officeName = args.officeName;
      agentName = args.agentName;
      employeeId = args.employeeId;
      email = args.email;
      freshworksEmail = args.freshworksEmail;
      extension = args.extension;
      brand = args.brand;
      policyNumber = args.policyNumber;
      attachments = args.attachments;
      submissionTime = Time.now();
      status = #Submitted;
      comments = [];
      priority = #empty;
    };
    tickets.add(ticketId, newTicket);
    ticketId;
  };

  // Now callable without authentication (always public Help Center management)
  public shared ({ caller }) func saveHelpTopic(topic : HelpTopic) : async Nat {
    let topicId = switch (draftHelpTopics.get(topic.id)) {
      case (null) {
        let newId = nextTopicId;
        nextTopicId += 1;
        let newTopic : HelpTopic = {
          id = newId;
          topicName = topic.topicName;
          platform = topic.platform;
          createdTime = Time.now();
          modifiedTime = Time.now();
          explanation = topic.explanation;
        };
        draftHelpTopics.add(newId, newTopic);
        newId;
      };
      case (?existing) {
        let updatedTopic : HelpTopic = {
          id = existing.id;
          topicName = topic.topicName;
          platform = topic.platform;
          createdTime = existing.createdTime;
          modifiedTime = Time.now();
          explanation = topic.explanation;
        };
        draftHelpTopics.add(existing.id, updatedTopic);
        existing.id;
      };
    };
    topicId;
  };

  // Now callable without authentication (always public)
  public shared ({ caller }) func deleteHelpTopic(topicId : Nat) : async () {
    draftHelpTopics.remove(topicId);
  };

  // Now callable without authentication (always public)
  public shared ({ caller }) func publishHelpContent() : async () {
    publishedHelpTopics.clear();
    for ((id, topic) in draftHelpTopics.entries()) {
      let publishedTopic : HelpTopic = {
        id = topic.id;
        topicName = topic.topicName;
        platform = topic.platform;
        createdTime = topic.createdTime;
        modifiedTime = Time.now();
        explanation = topic.explanation;
      };
      publishedHelpTopics.add(id, publishedTopic);
    };
  };

  // Now callable without authentication (except for frontend side UI password check)
  public query ({ caller }) func getTicketAnalytics(req : AnalyticsRequest) : async TicketAnalytics {
    let filteredTickets = tickets.values().toArray().filter(
      func(ticket) {
        ticket.submissionTime >= req.startTime and ticket.submissionTime <= req.endTime
      }
    );
    let periodMap = Map.empty<Text, PeriodCounts>();
    for (ticket in filteredTickets.values()) {
      let period = getPeriodKey(ticket.submissionTime, req.granularity);
      switch (periodMap.get(period)) {
        case (null) {
          switch (ticket.platform) {
            case (#OneSpan) {
              periodMap.add(period, {
                onespan = 1;
                observeAI = 0;
                freshworks = 0;
                total = 1;
              });
            };
            case (#ObserveAI) {
              periodMap.add(period, {
                onespan = 0;
                observeAI = 1;
                freshworks = 0;
                total = 1;
              });
            };
            case (#Freshworks) {
              periodMap.add(period, {
                onespan = 0;
                observeAI = 0;
                freshworks = 1;
                total = 1;
              });
            };
          };
        };
        case (?counts) {
          switch (ticket.platform) {
            case (#OneSpan) {
              periodMap.add(period, {
                onespan = counts.onespan + 1;
                observeAI = counts.observeAI;
                freshworks = counts.freshworks;
                total = counts.total + 1;
              });
            };
            case (#ObserveAI) {
              periodMap.add(period, {
                onespan = counts.onespan;
                observeAI = counts.observeAI + 1;
                freshworks = counts.freshworks;
                total = counts.total + 1;
              });
            };
            case (#Freshworks) {
              periodMap.add(period, {
                onespan = counts.onespan;
                observeAI = counts.observeAI;
                freshworks = counts.freshworks + 1;
                total = counts.total + 1;
              });
            };
          };
        };
      };
    };
    if (periodMap.isEmpty()) {
      let emptyPeriod = (formatDate(Time.now()), {
        onespan = 0;
        observeAI = 0;
        freshworks = 0;
        total = 0;
      });
      { periods = [emptyPeriod] };
    } else {
      let periodsArray = periodMap.toArray();
      { periods = periodsArray };
    };
  };
};
