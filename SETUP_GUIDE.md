# 🛠 HostelPro Setup Guide

This guide covers everything you need to set up, run, and deploy the HostelPro application.

## 1. Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js** (v16 or higher)
*   **npm** (Node Package Manager)
*   **Git**

## 2. Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd hostel-pro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## 3. Environment Setup (Supabase)

This project uses **Supabase** for the backend (Database & Auth). You need to create your own Supabase project.

1.  Go to [Supabase.com](https://supabase.com/) and create a new project.
2.  Once created, go to **Project Settings > API**.
3.  Copy the **Project URL** and **anon public key**.
4.  Create a file named `.env` in the root of your project (next to `package.json`).
5.  Add the following lines to `.env`:

    ```env
    VITE_SUPABASE_URL=your_project_url_here
    VITE_SUPABASE_ANON_KEY=your_anon_key_here
    ```

## 4. Database Schema Setup

You need to create the necessary tables in your Supabase database.
1.  Go to the **SQL Editor** in your Supabase Dashboard.
2.  Copy the content from the `supabase_schema_secured.sql` file located in the root of this project.
3.  Paste it into the SQL Editor and click **Run**.
    *   *Note: This will create tables for Residents, Rooms, Invoices, Payments, Expenses, etc., and set up Row Level Security (RLS) policies.*

## 5. Authentication Setup

1.  Go to **Authentication > Providers** in Supabase.
2.  Enable **Email/Password** sign-in.
3.  (Optional) Disable "Confirm email" if you want to allow immediate login without email verification during testing.

## 6. Running the Application

Start the local development server:

```bash
npm run dev
```

*   Open your browser and go to `http://localhost:5173` (or the port shown in the terminal).
*   **Login**: You can sign up a new user via the Login screen (since the app allows registration) or create a user manually in the Supabase Dashboard.

## 7. Building for Production

To create an optimized build for deployment:

```bash
npm run build
```

This will generate a `dist` folder containing the static files.

## 8. Deployment (Netlify)

This project is configured for easy deployment on Netlify.

1.  **Drag & Drop**:
    *   Run `npm run build`.
    *   Drag the `dist` folder to the "Manual Deploy" area in your Netlify Team Dashboard.

2.  **Git Integration (Recommended)**:
    *   Push your code to GitHub.
    *   Log in to Netlify and click "New site from Git".
    *   Select your repository.
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
    *   **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Netlify settings (Site Settings > Environment variables).

## ⚠️ Important Notes

*   **Security**: The database uses RLS (Row Level Security). Ensure your users are authenticated to access data.
*   **Backups**: Regularly export your data from the Supabase dashboard if needed.
*   **Customization**: To change meal prices, edit the `settings` table or use the Settings module (if enabled).

---
*If you encounter any issues, refer to the `src/context/DataContext.jsx` file to understand how data is fetched.*
