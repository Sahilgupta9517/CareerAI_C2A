import type { RoleRequirements, SkillComparison, UserSkill } from '@/types/skillGap'
import { compareRoleSkills } from '@/lib/skillMatching'

export type RoadmapPhaseName =
  | 'Phase 1 - Foundation'
  | 'Phase 2 - Core Skills'
  | 'Phase 3 - Advanced Skills'
  | 'Phase 4 - Project Recommendations'
  | 'Phase 5 - Interview Preparation'
  | 'Phase 6 - Job Ready'

export type RoadmapStatus = 'Not Started' | 'In Progress' | 'Completed'

export interface ProjectBrief {
  id: string
  title: string
  objective: string
  technologies: string[]
  skillsCovered: string[]
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  expectedOutcome: string
  whyItMatters: string
  estimatedDuration: string
}

export interface RoadmapItem {
  id: string
  skill: string
  phase: RoadmapPhaseName
  why: string
  outcome: string
  task: string
  duration: string
  status: RoadmapStatus
  requirement: 'Required' | 'Preferred' | 'Practice'
  priority: 'High' | 'Medium' | 'Low'
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  prerequisites: string[]
  comparison?: SkillComparison
  recommendedProject?: ProjectBrief
}

export interface RoadmapPhase {
  name: RoadmapPhaseName
  description: string
  items: RoadmapItem[]
}

const phaseNames: RoadmapPhaseName[] = [
  'Phase 1 - Foundation',
  'Phase 2 - Core Skills',
  'Phase 3 - Advanced Skills',
  'Phase 4 - Project Recommendations',
  'Phase 5 - Interview Preparation',
  'Phase 6 - Job Ready',
]

const phaseDescriptions: Record<RoadmapPhaseName, string> = {
  'Phase 1 - Foundation': 'Master the core foundational concepts and languages needed for day-to-day delivery.',
  'Phase 2 - Core Skills': 'Strengthen role-specific libraries, frameworks, and database workflows.',
  'Phase 3 - Advanced Skills': 'Extend your domain expertise with cloud, caching, testing, and system architecture.',
  'Phase 4 - Project Recommendations': 'Build verified portfolio projects that directly close your identified skill gaps.',
  'Phase 5 - Interview Preparation': 'Practice answering behavioral, technical, and live architectural questions.',
  'Phase 6 - Job Ready': 'Polish your resume, optimize portfolio links, and actively track job applications.',
}

const learningDetails = (skill: string) => {
  const name = skill.toLowerCase()
  if (name.includes('sql') || name.includes('database') || name.includes('postgres')) {
    return [
      'Write optimized queries, subqueries, relational schemas, indexing, and joins.',
      'Build a robust database model with schema migrations and seed scripts.',
      'Create and optimize complex SQL queries for analytics and backend services.',
      '2-3 weeks',
    ]
  }
  if (name.includes('react') || name.includes('next')) {
    return [
      'Compose modular components, manage reactive state, hooks, and responsive UX.',
      'Build a production-style dashboard with accessible loading and error boundaries.',
      'Develop a dynamic UI connected to backend REST/GraphQL APIs.',
      '2-3 weeks',
    ]
  }
  if (name.includes('docker') || name.includes('container')) {
    return [
      'Containerize applications, author multi-stage Dockerfiles, and orchestrate with Docker Compose.',
      'Create reproducible local development environments with isolated database containers.',
      'Build and publish lightweight, secure container images.',
      '1-2 weeks',
    ]
  }
  if (name.includes('system design') || name.includes('architecture')) {
    return [
      'Design scalable distributed systems, caching layers, load balancers, and failure resilience.',
      'Practice designing URL shorteners, notification services, and high-throughput APIs.',
      'Document trade-offs for latency, consistency, availability, and cost.',
      '2-4 weeks',
    ]
  }
  if (name.includes('python') || name.includes('fastapi') || name.includes('django')) {
    return [
      'Write idiomatic Python, async handlers, data validation models, and automated tests.',
      'Build an authenticated REST service with rate-limiting and structured logging.',
      'Deploy a tested backend service with OpenAPI documentation.',
      '2-3 weeks',
    ]
  }
  if (name.includes('testing') || name.includes('jest') || name.includes('pytest')) {
    return [
      'Write comprehensive unit, integration, and end-to-end regression test suites.',
      'Implement test-driven development (TDD) patterns and CI test runners.',
      'Achieve 80%+ test coverage across critical application business logic.',
      '1-2 weeks',
    ]
  }
  if (name.includes('rest') || name.includes('api')) {
    return [
      'Design RESTful API contracts, status codes, JWT authentication, and pagination.',
      'Implement versioned REST endpoints with input validation and schema checks.',
      'Document and test API routes using Swagger / OpenAPI specification.',
      '1-2 weeks',
    ]
  }
  return [
    `Learn the fundamental concepts and practical implementation of ${skill}.`,
    `Apply ${skill} in a focused milestone exercise to demonstrate competency.`,
    `Build a modular component showcasing ${skill} in your portfolio.`,
    '1-2 weeks',
  ]
}

const phaseFor = (comparison: SkillComparison): RoadmapPhaseName => {
  if (comparison.status === 'Missing' && comparison.requirement === 'Required') return 'Phase 1 - Foundation'
  if (comparison.status === 'Improving' || comparison.requirement === 'Required') return 'Phase 2 - Core Skills'
  return 'Phase 3 - Advanced Skills'
}

/**
 * Feature #6: Structured Project Recommendation Engine
 */
export const generateProjectRecommendations = (missingSkills: string[], targetRole: string): ProjectBrief[] => {
  const normalized = missingSkills.map((s) => s.toLowerCase())
  const projects: ProjectBrief[] = []

  if (normalized.some((s) => s.includes('docker') || s.includes('devops') || s.includes('cloud'))) {
    projects.push({
      id: 'proj-docker-cloud',
      title: 'Production-Ready Microservices API with Docker & CI/CD',
      objective: 'Build, containerize, and deploy a multi-service REST API with environment configuration and automated testing pipelines.',
      technologies: ['Docker', 'Docker Compose', 'GitHub Actions', 'PostgreSQL', 'Redis'],
      skillsCovered: ['Docker', 'DevOps', 'PostgreSQL', 'REST API'],
      difficulty: 'Intermediate',
      expectedOutcome: 'A deployable multi-container repository with zero-downtime healthchecks, automated lint/test workflows, and clear architecture README.',
      whyItMatters: `Demonstrates container orchestration and production readiness demanded by top ${targetRole} recruiters.`,
      estimatedDuration: '2-3 weeks',
    })
  }

  if (normalized.some((s) => s.includes('sql') || s.includes('postgres') || s.includes('database') || s.includes('rest'))) {
    projects.push({
      id: 'proj-database-api',
      title: 'Scalable E-Commerce & Analytics Backend Service',
      objective: 'Design a normalized relational database schema with indexed queries, complex aggregations, transaction isolation, and JWT authentication.',
      technologies: ['PostgreSQL', 'REST APIs', 'Node.js/Python', 'Prisma/SQLAlchemy', 'Jest/PyTest'],
      skillsCovered: ['PostgreSQL', 'REST APIs', 'Database Design', 'Authentication'],
      difficulty: 'Intermediate',
      expectedOutcome: 'A fully tested CRUD + analytics backend capable of handling 500+ concurrent requests with sub-50ms query response times.',
      whyItMatters: 'Proves your capability to design schema relationships and handle ACID transaction consistency.',
      estimatedDuration: '2-3 weeks',
    })
  }

  if (normalized.some((s) => s.includes('system design') || s.includes('redis') || s.includes('cache') || s.includes('kafka'))) {
    projects.push({
      id: 'proj-system-design',
      title: 'High-Throughput Distributed Notification & Event Pipeline',
      objective: 'Implement an asynchronous event-driven task queue with Redis caching, exponential backoff retries, and dead-letter queues.',
      technologies: ['System Design', 'Redis', 'WebSockets', 'Async Workers', 'Prometheus'],
      skillsCovered: ['System Design', 'Caching', 'Async Architecture', 'Monitoring'],
      difficulty: 'Advanced',
      expectedOutcome: 'An observable event queue handling real-time batch notifications with telemetry metrics dashboard.',
      whyItMatters: `Proves senior-level architectural maturity and system design trade-off reasoning for ${targetRole} roles.`,
      estimatedDuration: '3-4 weeks',
    })
  }

  // Fallback default project tailored to target role
  if (projects.length === 0) {
    projects.push({
      id: 'proj-core-portfolio',
      title: `Full-Stack ${targetRole} Portfolio Capstone Application`,
      objective: `Develop a comprehensive, full-lifecycle application showcasing your core ${targetRole} proficiencies with clean documentation.`,
      technologies: missingSkills.length ? missingSkills.slice(0, 4) : ['Modern Architecture', 'APIs', 'Testing', 'Database'],
      skillsCovered: missingSkills.slice(0, 4),
      difficulty: 'Intermediate',
      expectedOutcome: 'A live deployed application with end-to-end tests, API specifications, and interactive demo.',
      whyItMatters: `Directly addresses key requirements for ${targetRole} job descriptions.`,
      estimatedDuration: '2-3 weeks',
    })
  }

  return projects
}

export const generateRoadmap = (role: RoleRequirements, userSkills: UserSkill[]): RoadmapPhase[] => {
  const comparisons = compareRoleSkills(role, userSkills)
  const missingSkillNames = comparisons.filter((c) => c.status !== 'Strong').map((c) => c.skill)
  const projectBriefs = generateProjectRecommendations(missingSkillNames, role.title)

  // 1. Learning items for Phases 1, 2, 3
  const learningItems = comparisons
    .filter((comparison) => comparison.status !== 'Strong')
    .map((comparison): RoadmapItem => {
      const [outcome, task, , duration] = learningDetails(comparison.skill)
      return {
        id: `${role.id}-${comparison.requirement.toLowerCase()}-${comparison.skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        skill: comparison.skill,
        phase: phaseFor(comparison),
        why: comparison.reason,
        outcome,
        task: comparison.learningAction || task,
        duration,
        status: 'Not Started',
        requirement: comparison.requirement,
        priority: comparison.priority ?? (comparison.requirement === 'Required' ? 'High' : 'Medium'),
        difficulty: comparison.estimatedDifficulty,
        prerequisites: comparison.skill === 'REST API' ? ['Programming fundamentals'] : [],
        comparison,
      }
    })

  // 2. Project items for Phase 4 (Feature #6)
  const projectItems: RoadmapItem[] = projectBriefs.map((brief, idx): RoadmapItem => ({
    id: `${role.id}-proj-${brief.id}`,
    skill: brief.title,
    phase: 'Phase 4 - Project Recommendations',
    why: brief.whyItMatters,
    outcome: brief.expectedOutcome,
    task: `${brief.objective} Covered skills: ${brief.skillsCovered.join(', ')}.`,
    duration: brief.estimatedDuration,
    status: 'Not Started',
    requirement: 'Practice',
    priority: idx === 0 ? 'High' : 'Medium',
    difficulty: brief.difficulty,
    prerequisites: brief.skillsCovered.slice(0, 2),
    recommendedProject: brief,
  }))

  // 3. Interview Preparation items for Phase 5
  const interviewItems: RoadmapItem[] = [
    {
      id: `${role.id}-interview-tech-walkthrough`,
      skill: 'Technical & System Architecture Walkthrough',
      phase: 'Phase 5 - Interview Preparation',
      why: `Explain your implementation decisions, database indexing, and scalability trade-offs for ${role.title}.`,
      outcome: 'Fluently explain technical architecture and handle live follow-up questions from interviewers.',
      task: `Complete a 15-minute simulated technical interview session focusing on ${role.title} core skills.`,
      duration: '1 week',
      status: 'Not Started',
      requirement: 'Practice',
      priority: 'High',
      difficulty: 'Intermediate',
      prerequisites: ['Completed Phase 4 Project'],
    },
    {
      id: `${role.id}-interview-behavioral-star`,
      skill: 'Behavioral & STAR Method Articulation',
      phase: 'Phase 5 - Interview Preparation',
      why: 'Demonstrate leadership, cross-functional collaboration, and effective conflict resolution.',
      outcome: 'Prepare 3 STAR-method stories covering challenging bugs, tight deadlines, and architecture choices.',
      task: 'Practice behavioral mock interview simulation and review communication clarity scores.',
      duration: '1 week',
      status: 'Not Started',
      requirement: 'Practice',
      priority: 'Medium',
      difficulty: 'Beginner',
      prerequisites: [],
    },
  ]

  // 4. Job Ready items for Phase 6
  const jobReadyItems: RoadmapItem[] = [
    {
      id: `${role.id}-resume-ats-audit`,
      skill: 'ATS Resume Keyword Optimization',
      phase: 'Phase 6 - Job Ready',
      why: `Ensure your resume achieves 85%+ ATS score with verified ${role.title} industry keywords.`,
      outcome: 'Upload and audit your resume against target role descriptions with zero formatting flags.',
      task: 'Re-analyze resume on Resume Analyzer and align bullet points with project metrics.',
      duration: '3-5 days',
      status: 'Not Started',
      requirement: 'Practice',
      priority: 'High',
      difficulty: 'Beginner',
      prerequisites: ['Resume Analyzer'],
    },
    {
      id: `${role.id}-job-applications-active`,
      skill: 'Active Pipeline & Role Applications',
      phase: 'Phase 6 - Job Ready',
      why: `Apply to top matching ${role.title} openings with 75%+ skill match scores.`,
      outcome: 'Track 5+ active job applications through the Kanban application pipeline.',
      task: 'Explore Smart Job Matching, save target roles, and apply with tailored applications.',
      duration: 'Ongoing',
      status: 'Not Started',
      requirement: 'Practice',
      priority: 'Medium',
      difficulty: 'Beginner',
      prerequisites: ['ATS Resume Optimization'],
    },
  ]

  return phaseNames.map((name) => ({
    name,
    description: phaseDescriptions[name],
    items: [...learningItems, ...projectItems, ...interviewItems, ...jobReadyItems].filter(
      (item) => item.phase === name
    ),
  }))
}

