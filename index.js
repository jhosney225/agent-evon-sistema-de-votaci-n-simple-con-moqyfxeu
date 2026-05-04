
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface Vote {
  option: string;
  voter: string;
  timestamp: Date;
}

interface VotingSystem {
  question: string;
  options: string[];
  votes: Vote[];
  isOpen: boolean;
}

let votingSystem: VotingSystem = {
  question: "",
  options: [],
  votes: [],
  isOpen: false,
};

const conversationHistory: { role: "user" | "assistant"; content: string }[] =
  [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: `You are a voting system assistant. You help users create polls, vote, and see results. 
    Current voting system state:
    - Question: ${votingSystem.question || "No question set"}
    - Options: ${votingSystem.options.join(", ") || "No options set"}
    - Is Open: ${votingSystem.isOpen}
    - Total votes: ${votingSystem.votes.length}
    - Vote breakdown: ${getVoteBreakdown()}
    
    Help users with voting tasks. Be friendly and concise.`,
    messages: conversationHistory,
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

function getVoteBreakdown(): string {
  if (votingSystem.votes.length === 0) {
    return "No votes yet";
  }

  const breakdown: { [key: string]: number } = {};
  votingSystem.options.forEach((option) => {
    breakdown[option] = 0;
  });

  votingSystem.votes.forEach((vote) => {
    if (breakdown.hasOwnProperty(vote.option)) {
      breakdown[vote.option]++;
    }
  });

  return Object.entries(breakdown)
    .map(([option, count]) => `${option}: ${count}`)
    .join(", ");
}

function displayVotingStatus(): void {
  console.log("\n=== Voting System Status ===");
  if (votingSystem.question) {
    console.log(`Question: ${votingSystem.question}`);
    console.log(
      `Options: ${votingSystem.options.join(", ") || "No options set"}`
    );
    console.log(`Status: ${votingSystem.isOpen ? "OPEN" : "CLOSED"}`);
    console.log(`Total votes: ${votingSystem.votes.length}`);

    if (votingSystem.votes.length > 0) {
      console.log("\nResults:");
      const breakdown: { [key: string]: number } = {};
      votingSystem.options.forEach((option) => {
        breakdown[option] = 0;
      });

      votingSystem.votes.forEach((vote) => {
        if (breakdown.hasOwnProperty(vote.option)) {
          breakdown[vote.option]++;
        }
      });

      const total = votingSystem.votes.length;
      Object.entries(breakdown).forEach(([option, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        const barLength = Math.round((count / total) * 20);
        const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
        console.log(`  ${option}: ${count} votes (${percentage}%) ${bar}`);
      });
    }
  } else {
    console.log("No voting question set yet.");
  }
  console.log("============================\n");
}

async function createVoting(): Promise<void> {
  const question = await prompt("Enter the voting question: ");
  const optionsInput = await prompt(
    "Enter voting options separated by commas: "
  );
  const options = optionsInput
    .split(",")
    .map((opt) => opt.trim())
    .filter((opt) => opt.length > 0);

  if (options.length < 2) {
    console.log("Error: Please provide at least 2 voting options.");
    return;
  }

  votingSystem = {
    question,
    options,
    votes: [],
    isOpen: true,
  };

  console.log("\nVoting created successfully!");
  displayVotingStatus();

  const message = await chat(
    `A new voting poll has been created with the question: "${question}" and options: ${options.join(", ")}. The voting is now open. Acknowledge and prepare to help users vote.`
  );
  console.log(`Assistant: ${message}\n`);
}

async function castVote(): Promise<void> {
  if (!votingSystem.isOpen) {
    console.log("Error: Voting is not open.");
    return;
  }

  if (!votingSystem.question) {
    console.log("Error: No voting question set. Create a voting first.");
    return;
  }

  displayVotingStatus();

  const voter = await prompt("Enter your name: ");
  console.log(`Available options: ${votingSystem.options.join(", ")}`);
  const option = await prompt("Enter your vote: ");

  if (!votingSystem.options.includes(option)) {
    console.log("Error: Invalid option.");
    return;