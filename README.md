# Smart File Manager: File Management Made Easy

This project is an exploration into building an "AI-first" application. The goal was to create a mini Google Drive clone that leverages AI to automate the tedious parts of file organization. It's a demonstration of how AI can be a core part of the user experience, not just a development tool.

## ✨ Features

*   **Secure User Authentication:** Sign up and sign in with email and password, powered by Supabase Auth.
*   **File Uploads:** Upload single or multiple files with a drag-and-drop interface.
*   **Google Drive Integration:** Browse and import files directly from your Google Drive account.
*   **AI-Powered Organization:**
    *   **Automatic Tagging:** Files are automatically tagged with relevant keywords using the Gemini API.
    *   **Suggested Folder Names:** The AI suggests a folder name to categorize the file.
    *   **Improved File Names:** The AI can suggest more descriptive file names.
*   **File and Folder Management:**
    *   Create, delete, and manage folders.
    *   View files within folders or all at once.
    *   Search for files by name, tag, or type.
*   **"Apply to Similar Files" Feature:** Apply tags from one file to all other similar files in one click.
*   **"Organize Existing Files" Feature:** Retroactively organize all ungrouped files into AI-suggested folders.
*   **Google Drive Import:** Seamlessly browse your Google Drive and import files with one click, preserving AI organization.
*   **Responsive UI:** A clean and modern UI built with Tailwind CSS and shadcn/ui that works on all screen sizes.
*   **Robust Error Handling:** The application is designed to be resilient, with a fallback mechanism for the AI service.

## 🚀 Tech Stack

This project uses a modern, full-stack TypeScript architecture.

### Frontend

*   **Framework:** React with Vite
*   **Language:** TypeScript
*   **Routing:** `wouter`
*   **Data Fetching & State Management:** `@tanstack/react-query`
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui
*   **Schema Validation:** Zod

### Backend

*   **Framework:** Node.js with Express
*   **Language:** TypeScript
*   **Database ORM:** Drizzle ORM
*   **Authentication:** Supabase Auth
*   **File Uploads:** `multer`

### Database

*   **Database:** PostgreSQL
*   **Provider:** Supabase

### AI & External Integrations

*   **AI Provider:** Google Gemini
*   **File Import:** Google Drive API integration

### Deployment

*   **Platform:** Render

## 🏛️ Architecture & Design Decisions

*   **Monorepo Structure:** The project is organized into `client`, `server`, and `shared` directories. This approach allows for better code sharing and organization, especially for the database schema, which is used by both the frontend and backend.
*   **Full-Stack TypeScript:** Using TypeScript across the entire stack provides strong type safety, which reduces bugs and improves the developer experience.
*   **Drizzle ORM with Zod:** Drizzle ORM is a TypeScript-native ORM that offers excellent type safety for database queries. When combined with Zod for schema validation, it creates a highly reliable data layer.
*   **Supabase for BaaS:** Supabase provides a suite of backend services, including a PostgreSQL database, authentication, and file storage. This simplifies development by outsourcing common backend tasks.
*   **Decoupled Frontend and Backend:** The frontend and backend are developed as separate applications that communicate through a REST API. This separation of concerns makes the application easier to maintain and scale.

## 🤖 AI-Powered Features

The core of this project is its AI-powered file organization. The Gemini API is used to analyze files and automate tagging, folder suggestions, and filename improvements.

### Automatic Tagging and Organization

When a file is uploaded, the backend sends its name and type to the Gemini API with a carefully crafted prompt that instructs the AI to act as a "file organization expert."

**The Prompt:**

```
You are an AI file organization expert.
Analyze the file information and generate relevant tags, folder suggestions, and filename improvements.
Consider the file name, type, and content if provided.
Respond with JSON in the exact format specified.

File: {fileName}
Type: {fileType}
Content preview: {fileContent}

Generate appropriate tags and organization suggestions for this file.
Tags should be relevant categories like: document, report, image, project, finance, personal, work, etc.
Suggest a folder name if this file should be organized into a category.
Suggest an improved filename if the current one could be more descriptive.
```

### Fallback Mechanism

To ensure the application is robust, a fallback mechanism is in place. If the Gemini API fails, the system reverts to a rule-based tagging system. This ensures that the application remains functional even if the AI service is unavailable.

### "Apply to Similar Files" Feature

This feature allows users to apply the same tags to all similar files. The backend uses a simple algorithm to identify similar files based on their type and name patterns.

## 🛠️ Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn
*   A Supabase account
*   A Google Gemini API key
*   A Google Cloud Platform project with Drive API enabled

### Installation

1.  **Clone the repo:**
    ```sh
    git clone https://github.com/Saikat257-ui/Smart-File-Organizer.git
    ```
2.  **Install NPM packages:**
    ```sh
    npm install
    ```
3.  **Set up your environment variables:**
    *   Create a `.env` file in the root of the project by copying the `.env.example` file.
    *   Fill in the required environment variables:
        *   `SUPABASE_URL`: Your Supabase project URL.
        *   `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
        *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
        *   `DATABASE_URL`: Your Supabase database connection string.
        *   `GEMINI_API_KEY`: Your Google Gemini API key.
        *   `GOOGLE_CLIENT_ID`: Your Google OAuth2 client ID.
        *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth2 client secret.
        *   `GOOGLE_REDIRECT_URI`: OAuth2 redirect URI (typically http://localhost:5000/auth/google/callback for development).
        *   `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth2 client ID (for frontend).
4.  **Set up the database:**
    *   Run the SQL script in `supabase_setup.sql` in your Supabase SQL editor to create the necessary tables and policies.
    *   Push the Drizzle schema to your database:
        ```sh
        npm run db:push
        ```
5.  **Set up the bucket storage:**
    *   In your Supabase project, navigate to the "Storage" section.
    *   Create a new bucket for file uploads (e.g., `file-storage`).
    *   Configure the bucket policies to allow access for authenticated users.
    ### Policy 1: Allow authenticated users to upload files

        2. Go to the **"Policies"** tab
        1. In **Storage**, click on your `file-storage` bucket
        3. Click **"Add policy"**
        4. Choose **"Create a policy from scratch"**
        5. Fill in the policy:
        - **Name**: `Allow authenticated users to upload files`
        - **Allowed operation**: `INSERT`
        - **Target roles**: `authenticated`
        - **Policy definition**: 
            ```sql
            (bucket_id = 'file-storage') AND (auth.uid() IS NOT NULL)
            ```
        6. Click **"Save policy"**
    ### Policy 2: Allow authenticated users to view files


        2. Choose **"Create a policy from scratch"**
        1. Click **"Add policy"** again
        3. Fill in the policy:
        - **Name**: `Allow authenticated users to view files`
        - **Allowed operation**: `SELECT`
        - **Target roles**: `authenticated`
        - **Policy definition**: 
            ```sql
            (bucket_id = 'file-storage') AND (auth.uid() IS NOT NULL)
            ```
        4. Click **"Save policy"**

    ### Policy 3: Allow authenticated users to delete files

        1. Click **"Add policy"** again
        2. Choose **"Create a policy from scratch"**
        3. Fill in the policy:
        - **Name**: `Allow authenticated users to delete files`
        - **Allowed operation**: `DELETE`
        - **Target roles**: `authenticated`
        - **Policy definition**: 
            ```sql
            (bucket_id = 'file-storage') AND (auth.uid() IS NOT NULL)
            ```
        4. Click **"Save policy"**

    ### Policy 4: Allow authenticated users to update files

        1. Click **"Add policy"** again
        2. Choose **"Create a policy from scratch"**
        3. Fill in the policy:
        - **Name**: `Allow authenticated users to update files`
        - **Allowed operation**: `UPDATE`
        - **Target roles**: `authenticated`
        - **Policy definition**: 
            ```sql
            (bucket_id = 'file-storage') AND (auth.uid() IS NOT NULL)
            ```
        4. Click **"Save policy"**

6.  **Set up Google Drive API (Optional but recommended):**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/)
    *   Create a new project or select an existing one
    *   Enable the Google Drive API:
        1. Go to **"APIs & Services" > "Library"**
        2. Search for "Google Drive API"
        3. Click on it and press **"Enable"**
    *   Create OAuth2 credentials:
        1. Go to **"APIs & Services" > "Credentials"**
        2. Click **"Create Credentials" > "OAuth client ID"**
        3. Choose **"Web application"**
        4. Add authorized redirect URIs:
            - For development: `http://localhost:5000/auth/google/callback`
            - For production: `https://your-domain.com/auth/google/callback`
        5. Copy the **Client ID** and **Client Secret** to your `.env` file
    *   Configure OAuth consent screen if prompted

### Running the Application

*   **Start the development server:**
    ```sh
    npm run dev
    ```
    This will start both the frontend and backend servers.
*   Open your browser and navigate to `http://localhost:5173`.

## 🚀 Deployment

This project is configured for deployment on Render. The `render.yaml` file in the root of the project defines the services and settings for deployment. To deploy your own instance, you can connect your GitHub repository to Render and configure the environment variables in the Render dashboard.

## 🧠 AI in Development

AI was not just a feature in this project; it was also a co-pilot during development. I used ChatGPT only to:

*   **Generate boilerplate code:** AI helped to quickly scaffold components, server routes, and database schemas.
*   **Debug and troubleshoot:** AI was useful for identifying and fixing bugs, especially in complex code.
*   **Learn new technologies:** AI provided explanations and examples for libraries and frameworks that I was less familiar with.

While AI was a powerful tool, it was important to guide it and critically evaluate its suggestions. The final implementation is a result of human creativity and AI-powered automation working together.

## 💡 Future Ideas

*   **Semantic Search:** Implement semantic search using embeddings to allow users to search for files based on their meaning, not just keywords.
*   **AI-Powered Insights:** Provide users with insights into their file storage, such as identifying duplicate files or suggesting files that can be archived.
*   **Team Collaboration:** Add features for sharing files and folders with other users.
