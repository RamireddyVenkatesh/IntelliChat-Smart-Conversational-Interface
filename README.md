# IntelliChat: Smart Conversational Interface

This project implements a smart conversational interface leveraging the Google Gemini API for intelligent AI interactions. It features a robust backend API built with Spring Boot and a user-friendly frontend interface developed with React. IntelliChat allows users to engage in dynamic conversations with the AI, with full history management and various convenient features.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Frontend Overview](#frontend-overview)
- [Configuration](#configuration)
- [Entities](#entities)
- [DTOs](#dtos)
- [Repositories](#repositories)
- [Services](#services)
- [Controllers](#controllers)
- [Getting Started with Frontend](#getting-started-with-frontend)
- [Contributing](#contributing)

## Features

- **Intelligent Chat with Gemini:** Send natural language prompts to the Gemini API and receive contextually relevant AI-generated responses.
- **Persistent Conversation History:** Maintain a detailed history of each conversation, allowing for contextual back-and-forth interactions.
- **Initiate New Chats:** Easily start fresh conversational threads.
- **Conversation Overview:** Access a clear list of all past conversations, each summarized by its initial message and start time.
- **Detailed Message Retrieval:** Fetch and view the complete message history for any selected conversation.
- **User Message Editing:** Correct or refine your own previously sent messages.
- **Regenerate AI Responses:** Request alternative responses from Gemini based on a prior user message, enabling exploration of different AI perspectives.
- **Customizable Conversation Titles:** Assign meaningful titles to your conversations for better organization and recall.
- **Seamless Conversation Deletion:** Remove entire conversations and all associated messages permanently.
- **Dynamic Frontend Updates:** The chat interface updates in real-time as new messages are exchanged or actions are performed.
- **Enhanced Code Presentation:** Display code snippets within chat messages with automatic language detection and syntax highlighting.
- **Easy Code Copying:** Quickly copy code blocks from the chat interface to your clipboard.
- **Responsive and Adaptable UI:** The frontend design adjusts smoothly to different screen sizes and devices.

## Technologies Used

### Backend (Spring Boot)

- Java
- Spring Boot
- Spring WebFlux (for non-blocking HTTP client with WebClient)
- Spring Data JPA (for simplified database interactions)
- Jakarta Persistence API (JPA)
- Lombok (for concise and clean Java code)
- SLF4j (for structured application logging)
- Jackson (for efficient JSON serialization and deserialization)
- H2 Database (lightweight in-memory database for development; configurable for other databases)

### Frontend (React)

- JavaScript
- React
- React Hooks (useState, useEffect, useRef)
- `react-router-dom` (for declarative routing in the React application)
- `react-icons` (for a wide range of useful icons)
- `react-syntax-highlighter` (for elegant code syntax highlighting)
- `react-copy-to-clipboard` (for implementing the code copy functionality)
- Tailwind CSS (for rapid UI development with utility-first CSS)
- Axios (for making promise-based HTTP requests to the backend API)

## Prerequisites

Ensure the following are installed on your system before proceeding:

- **Java Development Kit (JDK):** Version 17 or later is recommended for optimal compatibility.
- **Maven:** The build automation tool for the Spring Boot backend.
- **Node.js and npm (or yarn):** The JavaScript runtime and package manager for the React frontend.
- **Google Cloud API Key:** A valid API key with access enabled for the Google Gemini API is essential for the AI interactions.

## Setup

### Backend

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd IntelliChat-Smart-Conversational-Interface
    cd backend
    ```

2.  **Configure `application.properties`:**
    Locate and open the `src/main/resources/application.properties` file. Update the following properties with your specific configuration:
    ```properties
    gemini.api.key=<YOUR_GEMINI_API_KEY>
    gemini.api.url=[https://generativelanguage.googleapis.com](https://generativelanguage.googleapis.com)
    gemini.api.model=gemini-pro
    spring.datasource.url=jdbc:h2:mem:intellichat_db
    spring.datasource.driver-class-name=org.h2.Driver
    spring.jpa.hibernate.ddl-auto=update
    server.port=8080
    ```
    Replace `<YOUR_GEMINI_API_KEY>` with your actual Google Cloud API key. You can adjust the `gemini.api.model` to experiment with different Gemini models. The provided database configuration uses an in-memory H2 database, ideal for development and testing. For production, consider configuring a more persistent database.

### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install  # or yarn install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root of the frontend directory and define the backend API base URL:
    ```env
    VITE_API_BASE_URL=http://localhost:8080/api/gemini
    ```
    Modify the URL if your backend server is running on a different host or port.

## Running the Application

### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Start the Spring Boot application using Maven:**
    ```bash
    mvn spring-boot:run
    ```
    The backend server will launch and be accessible on port 8080 (or the port specified in your `application.properties`).

### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Start the React development server:**
    ```bash
    npm run dev  # or yarn dev
    ```
    The frontend application will typically be served at `http://localhost:5173` in your web browser. Ensure the backend server is running for the frontend to communicate with the AI.

## API Endpoints

The backend exposes the following RESTful API endpoints for the frontend to interact with:

- **`POST /api/gemini/chat`**: Sends a user's chat prompt to the Gemini API and returns the AI's response along with conversation metadata.
    - Request Body:
      ```json
      {
        "prompt": "Your message to the AI",
        "conversationId": "Optional UUID of the current conversation"
      }
      ```
    - Response Body:
      ```json
      {
        "conversationId": "UUID of the ongoing conversation",
        "response": "The AI-generated response",
        "aiMessageId": "UUID of the AI's message",
        "modelVersion": "The specific Gemini model used for the response",
        "tokenUsage": {
          "promptTokens": number,
          "responseTokens": number,
          "totalTokens": number
        }
      }
      ```
- **`GET /api/gemini/conversations`**: Retrieves a list of summaries for all existing conversations (including their unique ID, title, and start time).
- **`GET /api/gemini/conversations/{conversationId}/messages`**: Fetches all messages associated with a given `conversationId`, ordered by their sequence number.
- **`PUT /api/gemini/message/{messageId}`**: Allows updating the content of a specific user message identified by its `messageId`.
    - Request Body:
      ```json
      {
        "newContent": "The updated content for the user message"
      }
      ```
- **`POST /api/gemini/conversations/{conversationId}/regenerate-from/{messageId}`**: Triggers the regeneration of an AI response based on a specific user message (`messageId`) within a conversation (`conversationId`). Subsequent messages in the conversation are deleted.
- **`PUT /api/gemini/conversations/{conversationId}/title`**: Updates the user-defined title of a specific conversation.
    - Request Body:
      ```json
      {
        "title": "The new title for the conversation"
      }
      ```
- **`DELETE /api/gemini/conversations/{conversationId}`**: Permanently deletes a specific conversation and all the messages it contains.
- **`GET /api/gemini/test`**: A simple endpoint to verify if the backend API is running correctly.

## Frontend Overview

The frontend, built with React, provides an intuitive interface for interacting with the IntelliChat backend. Key components include:

- **`App.js`**: The root component that sets up the main structure and routing of the application, rendering the central `ChatBot` component.
- **`ChatBot.js`**: Manages the core chat interface logic, including:
    - Maintaining the state of the current conversation ID and the list of messages.
    - Handling user input and dispatching prompts to the backend API.
    - Rendering the chat messages, differentiating between user and AI roles.
    - Implementing the functionality for regenerating AI responses.
- **`ChatArea.js`**: Responsible for rendering the individual chat messages, including specialized handling for code blocks with syntax highlighting and the "copy to clipboard" functionality.
- **`Sidebar.js`**: Displays a navigable list of past conversations, allowing users to:
    - Select and load existing conversations.
    - Initiate new chat sessions.
    - Rename existing conversations.
    - Delete conversations entirely.
- **`CodeBlock.js`**: A reusable component dedicated to rendering code snippets with appropriate syntax highlighting based on the detected language and providing a button to copy the code to the clipboard.

The frontend utilizes Tailwind CSS for styling, ensuring a responsive and visually appealing layout. It communicates with the backend API using Axios for making asynchronous HTTP requests.

## Configuration

- **Backend:** The primary configuration for the backend is managed through the `application.properties` file, where you set the Gemini API key, API endpoint, default model, and database connection details.
- **Frontend:** The base URL of the backend API is configured as an environment variable (`VITE_API_BASE_URL`) in the `.env.local` file.

## Entities

The backend uses the following JPA entities to model the application's data in the database:

- **`Conversation`**: Represents a single chat conversation.
    - `id` (UUID): A unique identifier for each conversation.
    - `startTime` (LocalDateTime): The timestamp indicating when the conversation began.
    - `title` (String): A user-defined title for the conversation, allowing for easy identification.
- **`Message`**: Represents an individual message within a conversation.
    - `id` (UUID): A unique identifier for each message.
    - `conversation` (Conversation): A foreign key linking the message to its parent `Conversation` (a many-to-one relationship).
    - `role` (String): Specifies the sender of the message ("user" or "model").
    - `content` (String): The actual text content of the message.
    - `sequenceNumber` (int): Indicates the order of the message within the conversation.
    - `timestamp` (LocalDateTime): The timestamp indicating when the message was created.

## DTOs

Data Transfer Objects (DTOs) are used to structure and transfer data between different layers of the application:

- **`ChatRequest`**: Used to encapsulate the data sent from the frontend when a user initiates a new chat message.
    - `prompt` (String): The user's input text.
    - `conversationId` (UUID): The optional ID of the current conversation, if it's an ongoing one.
- **`GeminiRequest`**: (Primarily used internally within the backend) Defines the structure for requests made to the Google Gemini API.
- **`GeminiResponse`**: Represents the structure of the response received from the Google Gemini API, including the generated content, usage metadata (token counts), and the model version used.
- **`MessageUpdateDto`**: Used to transfer the new content when a user wants to update their own message.
    - `newContent` (String): The updated text content of the message.

## Repositories

Spring Data JPA repositories provide an abstraction layer for interacting with the database entities:

- **`ConversationRepository`**: Extends `JpaRepository` to provide standard CRUD operations for the `Conversation` entity.
- **`MessageRepository`**: Extends `JpaRepository` and includes custom methods for querying and managing `Message` entities, such as finding messages by `conversationId`, deleting messages within a conversation, and retrieving messages based on their sequence number.

## Services

The backend services contain the core business logic of the application:

- **`ChatService`**: Orchestrates the chat functionality, including:
    - Processing incoming chat prompts and interacting with the `GeminiService` to get AI responses.
    - Managing the lifecycle of conversations (creation, retrieval, update, deletion).
    - Retrieving and managing messages within conversations.
    - Generating summaries of past conversations.
    - Implementing the logic for regenerating AI responses based on past messages.
- **`GeminiService`**: Handles the direct communication with the Google Gemini API, including:
    - Constructing and sending requests to the API with user prompts and conversation history.
    - Receiving and processing the responses from the Gemini API.

## Controllers

The REST controllers handle incoming HTTP requests from the frontend and delegate the business logic to the appropriate services:

- **`GeminiController`**: Exposes the API endpoints for:
    - Handling new chat messages and continuing existing conversations.
    - Retrieving lists of all conversations.
    - Fetching the message history for a specific conversation.
    - Updating the content of user messages.
    - Triggering the regeneration of AI responses.
    - Updating the titles of conversations.
    - Deleting entire conversations.
    - Providing a simple test endpoint to check the backend status.

## Getting Started with Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install  # or yarn install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev  # or yarn dev
    ```
    The IntelliChat frontend will be accessible in your browser, typically at `http://localhost:5173`. Ensure that the backend server is running for the frontend to connect and function correctly.

## Contributing

We welcome contributions to the IntelliChat project! If you have ideas for improvements, bug fixes, or new features, please feel free to submit pull requests or open issues to discuss them.
