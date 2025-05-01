# EZ Career Frontend

## Overview

EZ Career is an AI-powered job application management platform designed to streamline the job search process. This repository contains the frontend application built with React, TypeScript, and Tailwind CSS, featuring a modern UI powered by Shadcn UI components.

Developed for the Microsoft AI Agent Hackathon, EZ Career leverages AI agents to assist users throughout their job search journey, from resume analysis to interview preparation.

## Features

- **Dashboard**: Track application statistics, success rates, and visualize application status
- **Application Management**: Log and monitor job applications through different stages
- **AI-Powered Job Suggestions**: Get personalized job recommendations based on resume analysis
- **Question Answering**: Prepare for interviews with AI-assisted question prompts
- **Profile Management**: Upload and manage resume, personal information
- **Authentication**: Secure user authentication via Supabase
- **Agent Assistance**: AI agent support for various job search tasks

## Technologies Used

- **React 18** with **TypeScript**
- **Vite** as the build tool
- **Tailwind CSS** with **Shadcn UI** components
- **React Router** for routing
- **Supabase** for authentication, database, and storage
- **React Query** for data fetching and caching
- **Framer Motion** for animations
- **Recharts** for data visualization
- **React Hook Form** for form handling
- **Zod** for schema validation

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase account and project set up
- Backend service running (see ez-career-service repository)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ez-career.git
   cd ez-career-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_BACKEND_API_URL=your_backend_api_url
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:8080`

### Setting up the Database

To set up the initial database tables for the onboarding workflow:

```bash
npm run setup:onboarding
```

This script creates the necessary tables in your Supabase project for the application to function properly.

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_BACKEND_API_URL`: URL of the EZ Career backend service

## Project Structure

```
ez-career-frontend/
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── jobs/         # Job-related components
│   │   ├── layout/       # Layout components
│   │   ├── onboarding/   # Onboarding flow components
│   │   └── ui/           # Shadcn UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and configurations
│   │   ├── auth-context.tsx  # Authentication context
│   │   ├── storage-utils.ts  # Storage utilities
│   │   └── supabase.ts   # Supabase client initialization
│   ├── pages/            # Application pages/routes
│   └── App.tsx           # Main application component
├── supabase/             # Supabase configurations and migrations
├── .env                  # Environment variables (create this)
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
└── vite.config.ts        # Vite configuration
```

## Supabase Integration

EZ Career uses Supabase for:

1. **Authentication**: User signup, login, and session management
2. **Database**: Storing user profiles, job applications, and other data
3. **Storage**: File storage for resumes and other documents

The integration is set up in `src/lib/supabase.ts`, and the authentication flow is managed through `src/lib/auth-context.tsx`.

### Database Schema

The application relies on the following tables:

- `profiles`: User profile information
- `applications`: Job application records
- `questions`: Interview questions for practice
- `user_answers`: User responses to interview questions

## AI Agent Integration

EZ Career connects to a Python backend service that provides AI agent capabilities:

1. **Resume Analysis**: AI agents analyze resumes to extract skills and provide job recommendations
2. **Job Search Assistance**: Agents help users find suitable job positions
3. **Answer Evaluation**: Analysis of interview question responses
4. **Application Automation**: Assist with job application processes

This integration is implemented through API endpoints defined in the backend service, which the frontend calls using fetch requests.

### Key AI Features

- **Personalized Job Recommendations**: Based on resume analysis and user preferences
- **Interview Preparation**: AI-assisted question answering with feedback
- **Application Status Tracking**: Intelligent categorization and progress tracking
- **Resume Enhancement**: Suggestions for resume improvements

## Microsoft AI Agent Hackathon

This project was developed for the Microsoft AI Agent Hackathon to showcase how AI agents can transform the job search experience. The application demonstrates:

1. **Agentic Workflow**: Using multiple specialized agents for different aspects of job search
2. **Natural Language Interaction**: Communicate with agents in natural language
3. **Personalized Assistance**: Tailored help based on user profiles and preferences
4. **Streamlined UX**: Smooth integration of AI capabilities into a user-friendly interface

## Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Supabase](https://supabase.io/) for authentication and database
- [Shadcn UI](https://ui.shadcn.com/) for UI components
- [Microsoft AI Agent Hackathon](https://microsoftaiagent.devpost.com/) for inspiration and platform
