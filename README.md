

# SkillProof

**CVs are noise. Commits are signal.**

SkillProof is an evidence-first developer assessment platform built for **Zinduathon 3.0 — Noise vs Signal**. It transforms public GitHub activity into an explainable skill card, combining detected technical skills, a **Signal Score (0–100)**, and links to the repositories and development practices supporting each result.

For developers, SkillProof makes real work easier to demonstrate. For recruiters, it makes technical evidence easier to review, search, and discuss. Instead of relying only on self-reported skills, the platform connects claims to observable public work.

> **Assessment boundary:** SkillProof measures signals in public GitHub activity, not a person's complete ability, authorship, or employability. Its scores and flags support human review; they are not automated hiring decisions.

## The Problem

A CV can claim expertise in React, Python, or backend engineering, but the claim alone does not show how a developer builds software.

Recruiters often lack the time to inspect every repository, while early-career developers may have meaningful projects that are difficult to communicate through a conventional CV.

SkillProof bridges this gap by turning scattered GitHub evidence into a readable, traceable profile.

## How SkillProof Works

1. **Connect:** A developer provides a GitHub username or uses GitHub sign-in where configured.
2. **Collect:** The backend retrieves public repositories and development evidence through the GitHub REST API.
3. **Analyse:** Rule-based Python logic detects skills, evaluates development practices, calculates scores, and identifies review flags.
4. **Explain:** An AI-generated summary describes the computed evidence without changing the score or inventing skills. A fallback summary can be used when the AI provider is unavailable.
5. **Share and review:** The resulting skill card presents confidence labels, score reasons, and evidence links for developers and authorised recruiters.

## Core Features

| Area | Capability |
| --- | --- |
| GitHub Analysis | Public repository, language, commit, and project-structure evidence |
| Skill Profiles | Detected skills with confidence levels and supporting repositories |
| Signal Score | A 0–100 score with five explainable sub-scores |
| Claim Verification | Claimed-versus-evidenced skill labels |
| Evidence Review | Links to relevant repositories, files, commits, and practices |
| Developer Experience | Shareable skill cards and analysis feedback |
| Recruiter Experience | Approved recruiter access, candidate search, shortlists, and feedback |
| Administration | User and recruiter approval, audit logs, and management tools |
| Notifications | In-app messages, email, and opt-in SMS through Thrivewave |
| Job Matching | Job listings and candidate matching workflows |

Job matching and recruiting workflows extend the core GitHub skill-card concept. Their availability in a deployed demo should be verified before presenting them as live features.

## Signal Score Methodology

SkillProof calculates scores using **deterministic Python rules**, not an AI language model.

The Signal Score consists of five categories, each contributing a maximum of 20 points.

| Category | Description | Maximum |
| --- | --- | ---: |
| Consistency | Development activity across time | 20 |
| Iteration | Commit patterns, follow-up changes, and size distribution | 20 |
| Quality Practices | Evidence of tests, CI, documentation, and project configuration | 20 |
| Breadth | Strength across detected technical skills | 20 |
| Ownership | Contribution patterns in non-fork repositories | 20 |
| **Total** | | **100** |

### Skill Confidence Levels

Detected skills are classified into four confidence levels:

- **Strong:** Substantial supporting evidence across relevant work.
- **Moderate:** Meaningful evidence, but less extensive than a strong classification.
- **Emerging:** Limited evidence suggesting developing experience.
- **Unverified:** No supporting evidence found for the claimed skill.

### Noise Detection

SkillProof identifies patterns that may require further review, including:

- One-shot repository dumps
- Large code additions without subsequent iteration
- Tutorial-style repositories with minimal original development activity
- Claimed skills without supporting evidence

These indicators are not accusations of dishonesty or AI-generated code. They are signals intended to guide human review.

### Role of Artificial Intelligence

AI is used to generate plain-language explanations of computed results.

The AI component does not:

- Calculate or modify Signal Scores
- Invent technical skills
- Make hiring decisions
- Automatically reject candidates

**AI explains the evidence. Deterministic rules calculate the score.**

For detailed scoring formulas and examples, see [Scoring Documentation](backend/docs/SCORING.md).

## User Roles

### 1. Job Seeker

Job seekers can:

- Register and manage their accounts
- Connect or provide their GitHub usernames
- Analyse their own public GitHub profiles
- View detected skills and Signal Scores
- Examine supporting evidence
- Control profile visibility
- Receive recruiter feedback
- Manage email and SMS notification preferences

### 2. Recruiter

Approved recruiters can:

- Search visible developer profiles
- Filter candidates by technical skills and scores
- Examine evidence-backed skill cards
- Manage candidate shortlists
- Review candidate matches for job opportunities
- Send structured feedback to job seekers

Recruiter access is subject to administrative approval.

### 3. Administrator

Administrators can:

- Manage registered users
- Approve or reject recruiter access requests
- Review platform activity
- Manage system configurations
- Access audit records
- Monitor notifications
- Manage demo data and platform administration

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Django, Django REST Framework |
| Programming Language | Python |
| Analysis | Rule-based scoring engine, GitHub REST API |
| Database | PostgreSQL |
| Background Processing | Celery |
| Message Broker | Redis |
| Authentication | JWT, GitHub OAuth |
| Email | Django Email, SMTP, Mailpit |
| SMS | Thrivewave SMS API |
| API Documentation | OpenAPI, Swagger UI, ReDoc |
| Containerisation | Docker, Docker Compose |
| Testing and Quality | Automated tests, Ruff, coverage tools |
| Deployment | RumptyCloud |

## System Architecture

```text
                    SKILLPROOF PLATFORM
                             |
                   Next.js Frontend
                             |
                      REST API / JWT
                             |
                Django REST Framework
                             |
       +---------------------+--------------------+
       |                     |                    |
  Authentication       GitHub Analysis       Recruiting
       |                     |                    |
  Users and Roles      GitHub REST API       Search and Jobs
       |                     |                    |
       |              Python Scoring Engine        |
       |                     |                    |
       +---------------------+--------------------+
                             |
                         PostgreSQL
                             |
                      Redis and Celery
                             |
                   Notification Services
                             |
                Email / Thrivewave SMS
```

### Architecture Principles

- Separate the frontend from the backend through REST APIs.
- Keep scoring functions independent of Django models and network calls.
- Use deterministic rules for technical assessment.
- Restrict access through authentication and role-based permissions.
- Store analyses to reduce unnecessary GitHub API requests.
- Use background processing for asynchronous operations.
- Maintain audit logs for important platform actions.

For more information, see [Architecture Documentation](backend/docs/ARCHITECTURE.md).

## Project Structure

```text
SkillProof/
|
|-- README.md
|
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- public/
|   |-- package.json
|   |-- ...
|
|-- backend/
|   |-- .env.example
|   |-- Makefile
|   |-- config/
|   |   |-- settings/
|   |   |-- urls.py
|   |   |-- celery.py
|   |
|   |-- apps/
|   |   |-- core/
|   |   |-- accounts/
|   |   |-- companies/
|   |   |-- skills/
|   |   |-- analysis/
|   |   |-- notifications/
|   |   |-- recruiting/
|   |   |-- adminpanel/
|   |
|   |-- tests/
|   |-- scripts/
|   |-- docs/
|   |   |-- ARCHITECTURE.md
|   |   |-- DATABASE.md
|   |   |-- API.md
|   |   |-- AUTH.md
|   |   |-- SCORING.md
|   |   |-- NOTIFICATIONS.md
|   |   |-- FRONTEND_INTEGRATION.md
|   |   |-- SECURITY_AND_PRIVACY.md
|   |   |-- DEPLOYMENT.md
|   |   |-- TESTING.md
|   |   |-- DECISIONS.md
|
|-- TESTING_LOG.md
```

The frontend structure shown above is illustrative and should be aligned with the actual frontend directory.

## Getting Started

### Prerequisites

Before running SkillProof locally, ensure you have:

- Python 3.12
- Node.js and npm
- Docker and Docker Compose
- GNU Make
- Git
- A GitHub personal access token for real GitHub analysis

## Backend Setup

### Option 1: Virtual Environment with Docker Services

Clone the project and navigate to the backend directory.

```bash
git clone <repository-url>
cd SkillProof/backend
```

Create the environment configuration.

```bash
cp .env.example .env
```

Create the Python virtual environment.

```bash
make venv
```

Start the supporting services.

```bash
make services
```

Apply database migrations.

```bash
make migrate
```

Start the development server.

```bash
make run
```

The backend should be accessible at:

```text
http://localhost:8000
```

### Option 2: Run the Backend with Docker

Navigate to the backend directory.

```bash
cd backend
```

Copy the environment example.

```bash
cp .env.example .env
```

Start the development environment.

```bash
make dev
```

Alternatively:

```bash
docker compose up --build
```

### Stop Docker Services

```bash
docker compose down
```

To stop containers and remove associated volumes:

```bash
docker compose down -v
```

**Warning:** Removing Docker volumes may permanently delete locally stored database data.

### Local Services

| Service | Default Port |
| --- | --- |
| Django Backend | 8000 |
| PostgreSQL | 5433 |
| Redis | 6379 |
| Mailpit SMTP | 1025 |
| Mailpit Web Interface | 8025 |

If a port is already occupied, configure the appropriate host-port environment variables.

## Frontend Setup

Open a separate terminal and navigate to the frontend directory.

```bash
cd frontend
```

Install dependencies.

```bash
npm install
```

Start the Next.js development server.

```bash
npm run dev
```

The frontend will typically be available at:

```text
http://localhost:3000
```

Configure the frontend API URL using the environment variable expected by the frontend application.

For example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Check the frontend configuration to confirm the exact variable name and API URL format.

## Environment Configuration

SkillProof uses environment variables to manage credentials and application settings.

Depending on your deployment, configuration may include:

- Django secret key
- Debug mode
- Allowed hosts
- PostgreSQL connection details
- Redis connection settings
- GitHub API token
- GitHub OAuth credentials
- JWT configuration
- Email SMTP settings
- Thrivewave API credentials
- AI provider credentials
- CORS origins
- Frontend API base URL

Never commit production credentials, API keys, access tokens, or `.env` files to the repository.

Use `.env.example` files to document the required configuration without exposing secrets.

## API Documentation

The backend provides interactive API documentation through Swagger UI and ReDoc.

### Development URLs

| Endpoint | Description |
| --- | --- |
| `http://localhost:8000/api/v1/health` | Health check |
| `http://localhost:8000/api/v1/docs/` | Swagger UI |
| `http://localhost:8000/api/v1/redoc/` | ReDoc |
| `http://localhost:8000/api/v1/schema/` | OpenAPI schema |
| `http://localhost:8000/django-admin/` | Django administration |
| `http://localhost:8000/api/v1/auth/github/dev-login` | Development GitHub sign-in |
| `http://localhost:8025` | Mailpit email interface |

### API Conventions

The backend follows these conventions:

- Base URL: `/api/v1/`
- Authentication: JWT bearer tokens
- JSON field naming: `camelCase`
- Pagination: `page` and `pageSize`
- Standardised API errors
- Request tracing through `X-Request-ID`

Example authentication header:

```http
Authorization: Bearer <access-token>
```

Example error response:

```json
{
  "code": "recruiter_not_approved",
  "message": "Recruiter approval is required."
}
```

## Main API Modules

### Authentication

Provides account registration, login, GitHub authentication, user profiles, and account verification.

### GitHub Analysis

Retrieves repository evidence, evaluates technical skills, and produces explainable analysis results.

### Candidate Search

Allows approved recruiters to discover visible developer profiles using skills and assessment criteria.

### Recruiting

Supports job-related workflows, candidate matching, shortlists, and feedback.

### Notifications

Handles:

- In-app notifications
- Email delivery
- Opt-in SMS notifications
- Notification preferences
- Delivery logs
- Provider callbacks

### Administration

Supports user management, recruiter approvals, audit logs, and administrative reporting.

For complete endpoint definitions, see [API Documentation](backend/docs/API.md).

## Testing

SkillProof uses automated testing to improve reliability and verify important business rules.

### Run Backend Tests

```bash
cd backend
make test
```

### Run Tests with Coverage

```bash
make cov
```

### Run Linting

```bash
make lint
```

### Format Code

```bash
make format
```

### Generate API Schema

```bash
make schema
```

### Run Deployment Checks

```bash
make deploy-check
```

### Testing Areas

The testing strategy covers:

- Authentication and authorisation
- GitHub API integration
- Skill detection
- Signal Score calculations
- Noise flag detection
- Candidate search
- Recruiter approval
- Notification handling
- API validation and error responses

Recorded GitHub API fixtures allow repeatable tests without depending entirely on live API availability.

For additional information, see [Testing Documentation](backend/docs/TESTING.md).

## Demo Setup

The backend includes management commands for preparing demonstration accounts and sample data.

### Generate Demo Accounts

```bash
cd backend
python manage.py seed_demo
```

### Prepare GitHub Analyses

```bash
python manage.py warm_demo --logins octocat,another
```

Real GitHub analysis requires valid API access and an appropriately configured token.

The demo environment includes example users representing administrators, recruiters, and job seekers.

Demo credentials should be shared securely with authorised presenters rather than published in the repository.

The demo password can be configured using the `DEMO_PASSWORD` environment variable.

### Suggested Demo Flow

1. Sign in using a prepared developer or recruiter account.
2. Open a developer's SkillProof profile.
3. Display the Signal Score and its breakdown.
4. Select a technical skill.
5. Inspect the supporting repositories and commits.
6. Compare claimed skills with verified evidence.
7. Demonstrate recruiter search and feedback if available.
8. Demonstrate administrator approval and audit features if available.

For hackathon demonstrations, prepare cached analyses and screenshots to reduce dependence on external API availability.

## Security and Privacy

SkillProof is designed around responsible handling of developer information.

### Authentication and Authorisation

- JWT-based authentication
- Role-based access control
- Recruiter approval requirements
- Administrative access restrictions
- Protected API endpoints

### Data Protection

- Public GitHub data is used for core skill analysis.
- Users can control profile visibility.
- Notification preferences are respected.
- SMS delivery requires user consent.
- Sensitive credentials are stored outside source control.
- Important system activity is recorded through audit logs.

### Responsible Assessment

SkillProof does not claim that a Signal Score fully represents a developer's competence.

Limitations include:

- Private repositories are not included in the core analysis.
- Commit history cannot conclusively prove code authorship.
- Repository activity may be influenced by tutorials or generated code.
- Some developers demonstrate skills outside GitHub.
- The presence of testing infrastructure does not guarantee software quality.
- Scoring patterns can be manipulated.

Scores and flags are intended to assist human evaluation, not replace it.

See [Security and Privacy Documentation](backend/docs/SECURITY_AND_PRIVACY.md).

## Deployment

The backend documentation describes deployment using RumptyCloud.

The deployment process includes:

1. Preparing production environment variables.
2. Configuring PostgreSQL and Redis.
3. Building the Django application.
4. Applying database migrations.
5. Configuring static files and application services.
6. Starting background workers.
7. Configuring HTTPS and allowed hosts.
8. Running deployment checks.
9. Verifying health and API endpoints.

Frontend deployment should be configured separately according to the current Next.js hosting environment.

For detailed deployment instructions, see [Deployment Documentation](backend/docs/DEPLOYMENT.md).

## Documentation

| Document | Description |
| --- | --- |
| [Architecture](backend/docs/ARCHITECTURE.md) | Components, application modules, and request flows |
| [Database](backend/docs/DATABASE.md) | Data models, relationships, and constraints |
| [API](backend/docs/API.md) | Endpoints, authentication, and error handling |
| [Authentication](backend/docs/AUTH.md) | JWT, GitHub OAuth, roles, and approvals |
| [Scoring](backend/docs/SCORING.md) | Scoring rules, thresholds, and worked examples |
| [Notifications](backend/docs/NOTIFICATIONS.md) | In-app notifications, email, SMS, and webhooks |
| [Frontend Integration](backend/docs/FRONTEND_INTEGRATION.md) | API contracts and frontend integration |
| [Security and Privacy](backend/docs/SECURITY_AND_PRIVACY.md) | Security controls and data protection |
| [Deployment](backend/docs/DEPLOYMENT.md) | Production deployment instructions |
| [Testing](backend/docs/TESTING.md) | Test execution, fixtures, and coverage |
| [Decisions](backend/docs/DECISIONS.md) | Architectural decisions and trade-offs |

## Future Improvements

Potential future enhancements include:

- More advanced recruiter job matching
- Interactive code-explanation assessments
- PDF skill-card export
- Support for additional repository platforms
- Institutional and bootcamp dashboards
- Improved evidence visualisation
- More comprehensive analysis of software quality
- Expanded recruiter analytics

These improvements represent possible future development and should not be interpreted as completed features.

## Team and Contributions

SkillProof was developed collaboratively for Zinduathon 3.0.

The project work is organised into four main areas:

### GitHub Data and Integration

Responsible for:

- GitHub REST API integration
- Repository and commit collection
- API rate-limit handling
- GitHub fixtures and integration tests

### Skill Analysis and Scoring

Responsible for:

- Skill detection
- Signal Score calculations
- Confidence classification
- Noise detection
- Scoring unit tests

### Frontend Development

Responsible for:

- User interface design
- Developer skill cards
- Recruiter views
- Evidence visualisation
- Frontend integration

### Product Integration and Deployment

Responsible for:

- Backend coordination
- API and data-model integration
- AI summary integration
- Testing documentation
- Deployment preparation
- Product demonstration and pitch

Contributors are encouraged to use clear pull requests, meaningful commit messages, and automated checks.

Any AI-assisted code should be reviewed, understood, and tested by the contributor submitting it.

## Project Information

**Project Name:** SkillProof

**Hackathon:** Zinduathon 3.0

**Theme:** Noise vs Signal

**Category:** Developer Skills Assessment and Recruitment Technology

**Core Concept:** Evidence-backed developer skill verification using public GitHub activity.

---

**SkillProof — CVs are noise. Commits are signal.**
