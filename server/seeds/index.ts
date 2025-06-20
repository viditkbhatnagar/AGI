/**
 * Comprehensive database seeding script
 * - Creates users, students, courses, enrollments, and live classes
 * - Adds real course data for Certified Investment Associate and Certified Supply Chain Professional
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Selective‑seeding support
 *   • Pass a course slug as the first CLI arg, e.g.
 *       ts-node server/seeds/index.ts Certified-Logistics-Manager
 *     to seed just that course (and its quizzes / live classes) *without*
 *     wiping existing data.
 *   • With no arg, the script keeps the original "nuke & pave" behaviour.
 * ────────────────────────────────────────────────────────────────────────────────
 */

const courseToSeed = process.argv[2] ?? null; // slug or null
import { connectDB } from '../db';
import { User } from '../models/user';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import Quiz from '../models/quiz';

// Course data
const coursesData = {
  "certified-supply-chain-professional": {
    title: "Certified Supply Chain Professional",
    slug: "certified-supply-chain-professional",
    type: "standalone",
    description: "This certification covers all aspects of supply chain management from procurement to logistics",
    modules: [
      {
        title: "Supply Chain Fundamentals",
        videos: [
          {
            title: "Introduction to Supply Chain Management",
            duration: 45,
            url: "https://www.youtube.com/watch?v=xIY097gEXjk",
          },
          {
            title: "Procurement and Supplier Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=bPgheptnmWs",
          }
        ],
        documents: [
          {
            title: "Unit specifications and Assessment_Certified Supply Chain Professional",
            url: "https://docs.google.com/document/d/1Kl1_z9n9hDplq6jVSnlRgKQdif_CPAMR/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Introduction to SCM",
            url: "https://docs.google.com/presentation/d/1yC2Tct2l9ciX34-08PIbLLkvqk3Q3bJD/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Procurement and Supplier Management",
            url: "https://docs.google.com/presentation/d/16AQqJBa8Q-iiZtuaq46bPylG3HULX5h4/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
      },
      {
        title: "Operations and Inventory",
        videos: [
          {
            title: "Production and Operations Management",
            duration: 55,
            url: "https://www.youtube.com/watch?v=0ZDrpf5aMiw",
          },
          {
            title: "Inventory Management",
            duration: 45,
            url: "https://www.youtube.com/watch?v=0ZDrpf5aMiw",
          }
        ],
        documents: [
          {
            title: "Production and Operations Management",
            url: "https://docs.google.com/presentation/d/1r0XXI8OgZ2V3oPQ5o5BxKZeMeCEqDtoS/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Inventory Management",
            url: "https://docs.google.com/presentation/d/1ZhOvlPh7V0nfpttHG1YJ19u_nNxT4Z8-/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
      },
      {
        title: "Logistics and Distribution",
        videos: [
          {
            title: "Logistics and Distribution Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=p3-JiamZALw",
          }
        ],
        documents: [
          {
            title: "Transport, Logistics and Distribution Management",
            url: "https://docs.google.com/presentation/d/1aX0MMkHBIIUfg9k1wdjy998UyCV6zYPl/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
      },
      {
        title: "Risk Management and Strategy",
        videos: [
          {
            title: "Supply Chain Risk Management",
            duration: 40,
            url: "https://www.youtube.com/watch?v=Cu1ZUBCiMHw",
          },
          {
            title: "Lean and Agile Supply Chain Strategies",
            duration: 45,
            url: "https://www.youtube.com/watch?v=c/WorldofProcurement",
          }
        ],
        documents: [
          {
            title: "Supply Chain Risk Management",
            url: "https://docs.google.com/presentation/d/1M0K0gK7-6UbCtq7Qi39mqZDLDMlJ9k2p/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Lean and Agile Supply Chain Strategies",
            url: "https://docs.google.com/presentation/d/1FGIOR5p-5NiTXp99bkNPp3T0pke-BIjN/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
      },
      {
        title: "Global Supply Chain",
        videos: [
          {
            title: "Strategic Sourcing and Global Procurement",
            duration: 55,
            url: "https://www.youtube.com/watch?v=WKeCZqB2qaA",
          },
          {
            title: "Technology in Supply Chain Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=SXDvHgjRNDQ",
          },
          {
            title: "Sustainability and Ethics in Supply Chain",
            duration: 45,
            url: "https://www.youtube.com/watch?v=a0VFCFBV9nI",
          }
        ],
        documents: [
          {
            title: "Strategic Sourcing and Global Procurement",
            url: "https://docs.google.com/presentation/d/1cxjhIFrRe0bTzR8H9Xo9WFFadffy-DLW/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Technology in Supply Chain Management",
            url: "https://docs.google.com/presentation/d/1XSCY2287CNovLPrLpfsS4UBmZM-wYrIH/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          },
          {
            title: "Sustainability and Ethics in Supply Chain",
            url: "https://docs.google.com/presentation/d/1a8jRCsho6xYxTRKeVIysr2aBNzL78fB2/edit?usp=share_link&ouid=108184073387637142973&rtpof=true&sd=true"
          }
        ],
      }
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "biweekly",
      dayOfWeek: "Thursday",
      durationMin: 90,
    }
  },
  "Accounting-and-Finance": {
    title: "Accounting and Finance",
    slug: "Accounting-and-Finance",
    type: "standalone",
    description: "This certification prepares you for roles in financial services with a focus on investment products, regulations, and client management",
    modules: [
      {
        title: "Introduction to Accounting",
        videos: [
          {
            title: "Introduction to Accounting",
            duration: 91,
            url: "https://www.youtube.com/watch?v=E5gxATVojT0",
          },
          {
            title: "Accounting 101 basics, learning accounting basics, and fundamentals",
            duration: 141,
            url: "https://www.youtube.com/watch?v=zpYNeSxEHi8",
          }
        ],
        documents: [
          {
            title: "Principles of Financial Accounting",
            url: "https://drive.google.com/file/d/1ZvU8qvBdxL9-y900khWc05oi2jnIPbbK/preview"
          },
          {
            title: "MBA Pathway Accounting Intro to Accounting",
            url: "https://drive.google.com/file/d/1DwLKfcuNybQ2dsKbeeYjpPN8km89gcCp/preview"
          }
        ],
      },
      {
        title: "Financial Accounting",
        videos: [
          {
            title: "Accounting 101 basics, learning accounting basics, and fundamentals",
            duration: 141,
            url: "https://www.youtube.com/watch?v=zpYNeSxEHi8",
          }
        ],
        documents: [
          {
            title: "Principles of Financial Accounting",
            url: "https://drive.google.com/file/d/1ZvU8qvBdxL9-y900khWc05oi2jnIPbbK/preview"
          },
          {
            title: "MBA Pathway Accounting Financial Accounting",
            url: "https://drive.google.com/file/d/1DwLKfcuNybQ2dsKbeeYjpPN8km89gcCp/preview"
          }
        ],
      },
      {
        title: "Ratio Analysis",
        videos: [
          {
            title: "Ratio Analysis|Financial Statement Analysis|Reading Financial Statements|",
            duration: 53,
            url: "https://www.youtube.com/watch?v=-UbFZRd8Eds",
          }
        ],
        documents: [
          {
            title: "Worked Example Tata Steel",
            url: "https://drive.google.com/file/d/1-xHoIySwB7xBtP_cX241Fs7Z7W-LMjSZ/preview"
          },
          {
            title: "Worked Example TataSteel FS",
            url: "https://drive.google.com/file/d/1RvhyI_ZY5GazSnMUBR2hSpoJuE014frE/preview"
          },
          {
            title: "Ratio Analysis Worked Examples",
            url: "https://drive.google.com/file/d/1Tty_VX2WWhp2JXYdC7RV38r2KP4Atups/preview"
          },
          {
            title: "CFI Financial-Ratios EBook",
            url: "https://drive.google.com/file/d/1Aq8upYr0y8y56hQ7X1sYoJVDnY7XLy90/preview"
          },
          {
            title: "MBA Pathway Accounting Ratio Analysis",
            url: "https://drive.google.com/file/d/18J2IjkZKsnhz7NLehJZskzIzTz4HWHHA/preview"
          }
        ],
      },
      {
        title: "Ethical & Regulatory Aspects in Accounting",
        videos: [
          {
            title: "Professional Ethics - ACCA Audit and Assurance (AA)",
            duration: 35,
            url: "https://www.youtube.com/watch?v=G5PODQZpp-4",
          }
        ],
        documents: [
          {
            title: "MBA Pathway Accounting Ethical & Regulatory Aspects in Accounting",
            url: "https://drive.google.com/file/d/1rMpL4T6l1bftTqHNXmAjRAYGbTvAw2qw/preview"
          }
        ],
      },
      {
        title: "Understanding the Basic Principles of Financial Management",
        videos: [
          {
            title: "Introduction to Financial Management",
            duration: 12,
            url: "https://www.youtube.com/watch?v=MKLd1iw1lFw",
          },
          {
            title: "Time Value of Money - Explained (Step by Step Beginner's Guide)",
            duration: 13,
            url: "https://www.youtube.com/watch?v=_Kn5Q3DyZmY",
          }
        ],
        documents: [
          {
            title: "Principles Of Financial Management",
            url: "https://drive.google.com/file/d/1v4Ysd0nOQ6wa2SCNN5UWulfBpYJ5Qyul/preview"
          },
          {
            title: "Understanding the Basic Principles of Financial Management",
            url: "https://drive.google.com/file/d/1USXrcLOgS2yVd7J-luRYk4xYHfwUHKJc/preview"
          }
        ],
      },
      {
        title: "Recognizing the Importance of Capital Budgeting and Investment Decision-Making Processes ",
        videos: [
          {
            title: "Introduction to Financial Accounting and Analysis Definition and Terminology",
            duration: 19,
            url: "https://www.youtube.com/watch?v=QGjfObW8yg8",
          }
        ],
        documents: [
          {
            title: "Principles of Financial Management",
            url: "https://drive.google.com/file/d/1aqJLWY8kNRmpBIL5vKBCgFGJgORt4om3/preview"
          },
          {
            title: "Recognizing the Importance of Capital Budgeting and Investment Decision-Making Processes",
            url: "https://drive.google.com/file/d/1yPVVgycGxnFi2xx_rNubRZtHwhtjmQ3N/preview"
          }
        ],
      },
      {
        title: "Identifying Different Sources of Finance and Their Impact on Business Operations ",
        videos: [
          {
            title: "Introduction to Financial Accounting and Analysis Definition and Terminology",
            duration: 19,
            url: "https://www.youtube.com/watch?v=QGjfObW8yg8",
          }
        ],
        documents: [
          {
            title: "Principles of Finance",
            url: "https://drive.google.com/file/d/1ox-H7sBUYRsAnsGiPP_1Yj6uSTVTTRlG/preview"
          },
          {
            title: "Identifying Different Sources of Finance and Their Impact on Business Operations",
            url: "https://drive.google.com/file/d/1uKuNLCssoHk4lMyB-YU9Xy0iRC_t8rdk/preview"
          }
        ],
      },
      {
        title: "Explaining the Concepts of Risk Management and the Relationship Between Risk and Return in Financial Decisions ",
        videos: [
          {
            title: "Introduction to Financial Accounting and Analysis Definition and Terminology",
            duration: 19,
            url: "https://www.youtube.com/watch?v=QGjfObW8yg8",
          }
        ],
        documents: [
          {
            title: "Principles of Finance",
            url: "https://drive.google.com/file/d/1ox-H7sBUYRsAnsGiPP_1Yj6uSTVTTRlG/preview"
          },
          {
            title: "Explaining the Concepts of Risk Management and the Relationship Between Risk and Return in Financial Decisions",
            url: "https://drive.google.com/file/d/1Nm3lURdohZOZszMLP2kroCLu1y2LXfZv/preview"
          }
        ],
      }
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  },
  "Certified-Logistics-Manager": {
    title: "Certified Logistics Manager",
    slug: "Certified-Logistics-Manager",
    type: "standalone",
    description: "The Certified Logistics Manager (CLM) program equips you with the essential skills needed to manage logistics operations efficiently across industries. This program is designed to enhance your expertise in supply chain coordination, inventory management, transportation planning, and warehouse optimization. Gain the tools and knowledge to streamline logistics processes and achieve your career goals in logistics and supply chain management.",
    modules: [
      {
        title: "Strategic Logistics and Transport Management (CLM-101)",
        videos: [
          {
            title: "Logistics Management in 12 minutes",
            duration: 12,
            url: "https://www.youtube.com/watch?v=y9tyXL87l1A&t=371s",
          },
          {
            title: "What is Transport Management Daily Logistics",
            duration: 11,
            url: "https://www.youtube.com/watch?v=M2J74aEhhtI",
          },
          {
            title: "What is Logistics & Logistics Management | What are Modes of Transport | How to select TransMode ",
            duration: 8,
            url: "https://www.youtube.com/watch?v=ROUJSvhsjUg",
          }
        ],
        documents: [
          {
            title: "Handbook of Logistics and Distribution Management",
            url: "https://drive.google.com/file/d/1LHzXKtx2ykspw_KC9qIa3nXBGyiz6-kD/preview"
          },
          {
            title: "Strategic Logistics and Transport Management (CLM-101)",
            url: "https://drive.google.com/file/d/1SM54QuPT6yKkzNG2WMwD8DCR5ypPGXez/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Business Research (CLM-102)",
        videos: [
          {
            title: "Top 5 Logistics Management Key Performance Indicators (KPIs)",
            duration: 5,
            url: "https://www.youtube.com/watch?v=b3NRUCPjQ9g",
          },
          {
            title: "KPI - The Best KPI (Key Performance Indicator) for Supply Chain & Logistics",
            duration: 9,
            url: "https://www.youtube.com/watch?v=witWunLCEdI",
          }
        ],
        documents: [
          {
            title: "LSA",
            url: "https://drive.google.com/file/d/1jX4kmimDhO6on_GI0q_Ef9AoR9zwG6q-/preview"
          },
          {
            title: "Logistics Analytics and Performance Measurement (CLM-102)",
            url: "https://drive.google.com/file/d/1Ghp5rwKkNsjgPonpRtFlHSyyDApH-ZnY/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Change Management (CLM-103)",
        videos: [
          {
            title: "What is Logistics & Logistics Management | What are Modes of Transport | How to select TransMode",
            duration: 7,
            url: "https://www.youtube.com/watch?v=ROUJSvhsjUg",
          },
          {
            title: "Incoterms for beginners | Global Trade Explained",
            duration: 7,
            url: "https://www.youtube.com/watch?v=4LuSSdzK6aM",
          },
          {
            title: "Multimodal Transportation: (The Future of Travel)",
            duration: 7,
            url: "https://www.youtube.com/watch?v=I_01SGaacRI",
          }
        ],
        documents: [
          {
            title: "GTS Chapter 5 Part I WS",
            url: "https://drive.google.com/file/d/1Z0p0dZn1xld7N8lmI1QjkKpDigJVkQp1/preview"
          },
          {
            title: "ICC INCOTERMS-2020 Module",
            url: "https://drive.google.com/file/d/1hQm1R5625sV_niBXdEqKpotMIMPGbkE0/preview"
          },
          {
            title: "Global Logistics and Transportation Modes (CLM-103)",
            url: "https://drive.google.com/file/d/19FETH94xEqkdY3cMUqGOkXQELgRyF2wm/preview"
          }
        ],
      },
      {
        title: "Business Innovation and Entrepreneurship",
        videos: [
          {
            title: "What is Supply Chain Integration?",
            duration: 5,
            url: "https://www.youtube.com/watch?v=3iWHU66woNo&t=14s",
          }
        ],
        documents: [
          {
            title: "Christopher Logistics and Supply Chain Management",
            url: "https://drive.google.com/file/d/1Z_E7H9CSzo8Ea17GiyT2dSDTkdqTWit9/preview"
          },
          {
            title: "Supply Chain Planning and Coordination (CLM-104)",
            url: "https://drive.google.com/file/d/1cHZOl_DKg1wjqm58MLzaHxnFnHSHT9l3/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Manufacturing & Production Principles",
        videos: [
          {
            title: "Reshoring Trend: Why Companies are Bringing Manufacturing Back Home",
            duration: 6,
            url: "https://www.youtube.com/watch?v=fSwKofBUfGY&t=61s",
          },
          {
            title: "Sustainable Procurement – What You Should Know in 2025",
            duration: 5,
            url: "https://www.youtube.com/watch?v=KZA2UIjEDVE",
          },
          {
            title: "Sustainable Procurement Explained: Key Frameworks and Benefits",
            duration: 21,
            url: "https://www.youtube.com/watch?v=U1E6rtnreoA",
          }
        ],
        documents: [
          {
            title: "Global Purchasing and Supply Management",
            url: "https://drive.google.com/file/d/1mz3ZRiKwxCLuFnyVx3K7mK8iZiKUsBMe/preview"
          },
          {
            title: "Senior Strategic Global Procurement (CLM-105)",
            url: "https://drive.google.com/file/d/1VR7CKJrnEGj6qK76IqPEiDNG6USdLHmW/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Business Planning guides",
        videos: [
          {
            title: "10 Most Common Types of Leadership Styles (With Real-World Examples) | From A Business Professor",
            duration: 8,
            url: "https://www.youtube.com/watch?v=NY82yptNp5E",
          },
          {
            title: "5 Common Ethical Frameworks ",
            duration: 10,
            url: "https://www.youtube.com/watch?v=5UNdnkBRack",
          }
        ],
        documents: [
          {
            title: "Leadership",
            url: "https://drive.google.com/file/d/16UGmlrRiYli4rr9tHM5H0n1guD5K1ppt/preview"
          },
          {
            title: "Senior Strategic Leadership (CLM-106)",
            url: "https://drive.google.com/file/d/1PEefRA3VPPmFdWRCJovz6svfCLiwq-3M/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Global Procurement",
        videos: [
          {
            title: "Saving Logistics Costs Part 1 - Inventory",
            duration: 9,
            url: "https://www.youtube.com/watch?v=pc6-iW0YyBc",
          },
          {
            title: "3 Simple Ways to Save Logistics Costs",
            duration: 6,
            url: "https://www.youtube.com/watch?v=mm2N-cMhRD8",
          }
        ],
        documents: [
          {
            title: "Costing Logistics",
            url: "https://drive.google.com/file/d/1gE1__nhc0_kZtW96Jbwti0HbjqhJEIKv/preview"
          },
          {
            title: "Types of Logistics Costs You Should Keep Track Of",
            url: "https://drive.google.com/file/d/1vMN9jR55N59EHKK1Rh4i0KzCtparUFc9/preview"
          },
          {
            title: "Logistics Cost Management and Financials(CLM-107)",
            url: "https://drive.google.com/file/d/1v57tTiUAFxcA6LYjxslHz9PZ8TVJ4YFq/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Leadership",
        videos: [
          {
            title: "Explanation of the EFQM Model",
            duration: 8,
            url: "https://www.youtube.com/watch?v=evuEcypUnDQ",
          },
          {
            title: "Lean vs TQM | Lean vs Total Quality Management",
            duration: 2,
            url: "https://www.youtube.com/watch?v=fSLXnG6TgNc",
          }
        ],
        documents: [
          {
            title: "QM",
            url: "https://drive.google.com/file/d/1wTJPA_7QqDG3tOigSyLudKNa6cX-sZVW/preview"
          },
          {
            title: "Senior Strategic Quality Management (CLM-108)",
            url: "https://drive.google.com/file/d/1wxHviFUL6zNWRNWsOBYp-JvkppTeZm5o/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Management Principles",
        videos: [
          {
            title: "What is Warehouse Management? [Intro to Inventory Management, Pick Pack Ship, WMS Software, etc] ",
            duration: 10,
            url: "https://www.youtube.com/watch?v=IaRS5_hSA3g",
          },
          {
            title: "Inventory Management",
            duration: 9,
            url: "https://www.youtube.com/watch?v=0NOER-Lle-0",
          },
          {
            title: "McKinsey 7S Framework",
            duration: 11,
            url: "https://www.youtube.com/watch?v=DFNJypMOIMI",
          }
        ],
        documents: [
          {
            title: "Essentials Of Inventory Management",
            url: "https://drive.google.com/file/d/1DaLbloB4PXrRLX9-DrTH56je8GZwzQVz/preview"
          },
          {
            title: "Senior Strategic Warehousing & Inventory Management (CLM-109)",
            url: "https://drive.google.com/file/d/18sz4WKjjrBqWpW5vQOmDEcyIa3rTDE_S/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Maritime Management",
        videos: [
          {
            title: "Artificial Intelligence & Machine Learning in Logistics, Supply Chain & Transportation",
            duration: 6,
            url: "https://www.youtube.com/watch?v=J31_Ma4dwKg",
          },
          {
            title: "AI in supply chain and logistics | Artificial Intelligence in supply chain management",
            duration: 7,
            url: "https://www.youtube.com/watch?v=JfjpFJxIjeQ",
          }
        ],
        documents: [
          {
            title: "Generative AI in Supply Chain Report",
            url: "https://drive.google.com/file/d/1KB6UCOiPpWF0J6ScZzORceC8Gtt4ksq9/preview"
          },
          {
            title: "Generative AI in Logistics (CLM-110)",
            url: "https://drive.google.com/file/d/1zqHqCeI-HpCm8dZG8K3Ydx5eATCOBpXm/preview"
          }
        ],
      },
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  },
  "Certified-Human-Resource-Professional": {
    title: "Certified Human Resource Professional",
    slug: "Certified-Human-Resource-Professional",
    type: "standalone",
    description: "AGI's Certified Human Resource Professional (CHRP) program equips you with advanced skills in HR strategy, talent management, and organizational development, empowering you to lead impactful HR initiatives and drive workforce success across diverse industries.",
    modules: [
      {
        title: "Fundamentals of Human Resource Management",
        videos: [
          {
            title: "Human Resource Management (HRM) Explained – Everything you Need to Know",
            duration: 15,
            url: "https://www.youtube.com/watch?v=aPEUKLxxh_k&t=4s",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1oYtjzHRURZmT1EtpH19lu8n0FyuZ04Cm/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1VtpKz9nt1SSCiP620y1xICtBGHdpu6BI/preview"
          },
          {
            title: "Unit 1",
            url: "https://drive.google.com/file/d/14y8QHqFZaOuSdlY-bn1S8iUn62ZFV-Xn/preview"
          }
        ],
      },
      {
        title: "Talent Acquisition and Onboarding",
        videos: [
          {
            title: "Talent Acquisition Explained",
            duration: 11,
            url: "https://www.youtube.com/watch?v=bDhN_euuMlo",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 2",
            url: "https://drive.google.com/file/d/1SbV9XgU8z9MRP3IsjE5lfjv5a8L4PkEd/preview"
          }
        ],
      },
      {
        title: "Employee Development and Training",
        videos: [
          {
            title: "Training & Development: 6 Best Practices For L&D",
            duration: 9,
            url: "https://www.youtube.com/watch?v=GkPi4ETzn2A",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 3",
            url: "https://drive.google.com/file/d/1xwZ7UP1yFLjd9PSfOVmanJQmfby8CtIm/preview"
          }
        ],
      },
      {
        title: "Performance Management",
        videos: [
          {
            title: "Performance Management",
            duration: 23,
            url: "https://www.youtube.com/watch?v=hR9NDLr_XLs",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 4",
            url: "https://drive.google.com/file/d/1Evp4RwVBJWn1D2mJY8hhl5NVLxBG6VkN/preview"
          }
        ],
      },
      {
        title: "Compensation and Benefits",
        videos: [
          {
            title: "Compensation and Benefits in Human Resource Management",
            duration: 28,
            url: "https://www.youtube.com/watch?v=wFHtfheFFPY",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 5",
            url: "https://drive.google.com/file/d/1IAM3caAPeiPI5ymBrvgRvPLzI2EWyl6v/preview"
          }
        ],
      },
      {
        title: "Employment Law and Labour Relations",
        videos: [
          {
            title: "New UAE Labour Law Explained",
            duration: 7,
            url: "https://www.youtube.com/watch?v=NKu7QhCmtsY",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 6",
            url: "https://drive.google.com/file/d/1RL2QRRkO3QaQQoRl4iSPXOShhJTIjshB/preview"
          }
        ],
      },
      {
        title: "Organizational Culture and Change Basics",
        videos: [
          {
            title: "Organizational Culture Explained [2025]",
            duration: 13,
            url: "https://www.youtube.com/watch?v=6uLN9dVfOBI",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 7",
            url: "https://drive.google.com/file/d/1GSzO6ZUXbDG9V8ZbCw2Z88cp5RUuPFQc/preview"
          }
        ],
      },
      {
        title: "Introduction to HR Analytics",
        videos: [
          {
            title: "HR Analytics for Beginners - A Roadmap",
            duration: 16,
            url: "https://www.youtube.com/watch?v=XHUhBdu09eo",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Reading Materials",
            url: "https://docs.google.com/document/d/1UP6WfrbF2Zt0lv7ETHQqFMiS9n2XwtXG/preview"
          },
          {
            title: "Case Study - HR Analytics",
            url: "https://docs.google.com/document/d/1p2vciV6oI5IaTl28sN2uJvx-MGR1qEUe/preview"
          },
          {
            title: "Unit 8",
            url: "https://drive.google.com/file/d/1Czf1ZIP-blMEG6ZlHKsvA9M-L3sbhCI4/preview"
          }
        ],
      },
      {
        title: "Ethics and CSR in HR",
        videos: [
          {
            title: "HR Basics: Human Resource Ethics",
            duration: 4,
            url: "https://www.youtube.com/watch?v=QdQuzoHQt90",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 9",
            url: "https://drive.google.com/file/d/1MXnQfESHrGZzQVJZEwu6pg51kxMM4p8o/preview"
          }
        ],
      },
      {
        title: "Diversity Management",
        videos: [
          {
            title: "Managing Diversity in the Workplace",
            duration: 16,
            url: "https://www.youtube.com/watch?v=Sa2eUON-noo",
          }
        ],
        documents: [
          {
            title: "MBA SSM HRM Pearson",
            url: "https://drive.google.com/file/d/1jcTgvvLeI4Mx1OMeEUHJuXms5zVpornw/preview"
          },
          {
            title: "MBA SSM HRM Gary Dessler",
            url: "https://drive.google.com/file/d/1xS89QzaMWHLhscKKHU9mr4CU8e-C2iV7/preview"
          },
          {
            title: "Unit 10",
            url: "https://drive.google.com/file/d/1q5qhE9BDYb_Lh7IUa85T_K6xh6VB3xV6/preview"
          }
        ],
      },
      {
        title: "AI in HR",
        videos: [
          {
            title: "How Generative AI impacts Human Resources with ex-Amazon leader Trent Gillespie",
            duration: 4,
            url: "https://www.youtube.com/watch?v=8iIHH9QvBMg",
          }
        ],
        documents: [
          {
            title: "Reading Materials",
            url: "https://docs.google.com/document/d/1HmaDtl5bzuM22Xhd806Va3H4WBu8aQjM/preview"
          },
          {
            title: "Paper 1",
            url: "https://drive.google.com/file/d/1o3WyUqd8-kKU5r__miA45nJsnUjN6TGC/preview"
          },
          {
            title: "Paper 2",
            url: "https://drive.google.com/file/d/13n8JEkZIwRLxYpSopavvpA-RXH0q8ns_/preview"
          },
          {
            title: "Case Study - AI in HR",
            url: "https://docs.google.com/document/d/1UhQDgXfG16QbOXe13zNJpHmLXguUnsgn/preview"
          },
          {
            title: "Unit 11",
            url: "https://drive.google.com/file/d/1x8e-3PHzt_WCAXD3L7wdp6aoroKENsRv/preview"
          }
        ],
      },
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  },
  "Certified-Sustainability-And-Leadership": {
    title: "Certified Sustainability Leadership And Management",
    slug: "Certified-Sustainability-And-Leadership",
    type: "standalone",
    description: "AGI's Certified Sustainability Management program provides in-depth knowledge of sustainable practices, environmental policy, and corporate responsibility, preparing you to lead initiatives for a sustainable future.",
    modules: [
      {
        title: "Introduction to ESG",
        videos: [
          {
            title: "What is ESG? Introduction to Environmental, Social and Governance",
            duration: 8,
            url: "https://www.youtube.com/watch?v=D3NkqJ6DEP8",
          },
          {
            title: "Introduction to ESG | Environmental, Social and Governance",
            duration: 140,
            url: "https://www.youtube.com/watch?v=s01TCVhyU1A",
          },
          {
            title: "ESG fundamentals: Sustainable finance & investing part 1",
            duration: 8,
            url: "https://www.youtube.com/watch?v=IA3ZXMRAXNY",
          }
        ],
        documents: [
          {
            title: "SG-101- Introduction to ESG",
            url: "https://docs.google.com/presentation/d/1tNP4NYGzwa2cK-HEX-0ts5jLz257N5Lm/preview"
          }
        ],
      },
      {
        title: "ESG Data and Sustainability Assurance",
        videos: [
          {
            title: "Understanding ESG Reporting",
            duration: 24,
            url: "https://www.youtube.com/watch?v=3Dq_ZXv18cI",
          },
          {
            title: "ESG Rating Methodology; Everything You Need To Know",
            duration: 18,
            url: "https://www.youtube.com/watch?v=eZq-xIo3dFg",
          },
          {
            title: "What is Sustainability Assurance?",
            duration: 6,
            url: "https://www.youtube.com/watch?v=PmLsCv3Nkr4",
          }
        ],
        documents: [
          {
            title: "SG-102- ESG Data & Sustainability Assurance",
            url: "https://docs.google.com/presentation/d/1my5BBGCbhNkf-jJVKDYO54_SWLot2vQr/preview"
          }
        ],
      },
      {
        title: "Saving your company and saving your planet",
        videos: [
          {
            title: "ESG & Sustainability Explained: Why Companies Must Adapt or Fall Behind",
            duration: 12,
            url: "https://www.youtube.com/watch?v=yz8lRz_SuuY",
          },
          {
            title: "Transforming ESG Challenges into Opportunities",
            duration: 45,
            url: "https://www.youtube.com/watch?v=m7hCffRUKU0",
          },
          {
            title: "ESG in Practice: A Real World Case Study",
            duration: 61,
            url: "https://www.youtube.com/watch?v=0T8i8v2wbZc",
          }
        ],
        documents: [
          {
            title: "SG-103- Saving your company and saving your planet",
            url: "https://docs.google.com/presentation/d/1HUF03FGMt7QC8e5ckjhhDZRNIxfsg5Ga/preview"
          }
        ],
      },
      {
        title: "The Social Effect-Tipping points and Stakeholders",
        videos: [
          {
            title: "Addressing Human Rights and Labor Rights in Companies Using ESG Strategies and Disclosures",
            duration: 96,
            url: "https://www.youtube.com/watch?v=htNAcdxhmqU",
          },
          {
            title: "Navigating the Growing Stakeholder Expectations in ESG and CSR",
            duration: 20,
            url: "https://www.youtube.com/watch?v=OwgGaxoqt00",
          },
          {
            title: "From Protest to Purpose: How HR Can Drive ESG for Social Impact",
            duration: 48,
            url: "https://www.youtube.com/watch?v=8hMV_Fm3MpU",
          }
        ],
        documents: [
          {
            title: "SG - 104 The Social Effect - Tipping Points and Stakeholders",
            url: "https://docs.google.com/presentation/d/1pSeSxrg0806mlRODibA4tFd1_H5rrQkn/preview"
          }
        ],
      },
      {
        title: "ESG or Sustainability Agenda and Its Influence on the Role of Corporate Governance",
        videos: [
          {
            title: "Integrating ESG into Corporate Strategy",
            duration: 23,
            url: "https://www.youtube.com/watch?v=AGTW4F0Jy8A",
          },
          {
            title: "Stakeholder Theory",
            duration: 7,
            url: "https://www.youtube.com/watch?v=aoTNtj3kL3o",
          },
          {
            title: "Integrating ESG: Best Practices and Innovations",
            duration: 51,
            url: "https://www.youtube.com/watch?v=UQ--oqftaZA",
          }
        ],
        documents: [
          {
            title: "SG - 105 ESG or Sustainability Agenda and Its Influence on the Role of Corporate Governance",
            url: "https://docs.google.com/presentation/d/1aghVcnedgOV9B18zxw7E-28nbVhqNFvt/preview"
          }
        ],
      },
      {
        title: "The Dual Intersection Between Technology and ESG",
        videos: [
          {
            title: "Blockchain and ESG: Enhancing Transparency and Accountability",
            duration: 7,
            url: "https://www.youtube.com/watch?v=xg5QFkqnq_Y",
          }
        ],
        documents: [
          {
            title: "SG -106 The Dual Intersection Between Technology and ESG",
            url: "https://docs.google.com/presentation/d/16RAawhAkfz2ytzXP6YlDOtnIoHf1kF9i/preview"
          }
        ],
      },
      {
        title: "Mainstreaming ESG to Improve and Innovate",
        videos: [
          {
            title: "Integrating ESG into Business Strategy",
            duration: 23,
            url: "https://www.youtube.com/watch?v=AGTW4F0Jy8A",
          },
          {
            title: "ESG in practice: a real world case study",
            duration: 60,
            url: "https://www.youtube.com/watch?v=0T8i8v2wbZc",
          }
        ],
        documents: [
          {
            title: "SG -107 Mainstreaming ESG to Improve and Innovate",
            url: "https://docs.google.com/presentation/d/1fgS9IjuJqJ94gSv-CADJGuiI6woiADbw/preview"
          }
        ],
      },
      {
        title: "Financial Services - Impact and ESG",
        videos: [
          {
            title: "How Banks & Financial Companies Use ESG",
            duration: 10,
            url: "https://www.youtube.com/watch?v=z7Dltq0FMGI",
          },
          {
            title: "ESG: Trends, Regulations and Strategies",
            duration: 8,
            url: "https://www.youtube.com/watch?v=of53SiJa5vc",
          },
          {
            title: "ESG and Corporate Finance: The Financial Impact of Sustainability",
            duration: 26,
            url: "https://www.youtube.com/watch?v=2gqDfld_lj4",
          }
        ],
        documents: [
          {
            title: "SG - 108 Financial Services - Impact and ESG",
            url: "https://docs.google.com/presentation/d/1YlBaGDN68lpnqFYh2C7kzSjz10jLtEBo/preview"
          }
        ],
      },
      {
        title: "Criticism and Controversies Around ESG",
        videos: [
          {
            title: "ESG Ratings Are Not What They Seem",
            duration: 13,
            url: "https://www.youtube.com/watch?v=f_rrS-_giP8",
          },
          {
            title: "Should Environmental, Social and Governance Influence Investment?",
            duration: 93,
            url: "https://www.youtube.com/watch?v=NkB1s4EBQaU",
          },
          {
            title: "Using Robust Governance Practices in ESG to Stamp Out Greenwashing",
            duration: 61,
            url: "https://www.youtube.com/watch?v=eyyjrJMqz9g",
          }
        ],
        documents: [
          {
            title: "SG - 109 Criticism and Controversies Around ESG",
            url: "https://docs.google.com/presentation/d/1UfZxo6w64lgGVXZ2wRBLqLy41lfhTyVl/preview"
          }
        ],
      },
      {
        title: "Contemporary Issues in Business Sustainability",
        videos: [
          {
            title: "Sustainability Trends in 2025: What Businesses Need to Know",
            duration: 5,
            url: "https://www.youtube.com/watch?v=4yQM0xvBm4Q",
          }
        ],
        documents: [
          {
            title: "SG – 110 Contemporary Issues in Business Sustainability",
            url: "https://docs.google.com/presentation/d/1WvNq8nPMq_hSGRHMK6bDeffc3Lw8R23L/preview"
          }
        ],
      },
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  },
  "Certified-Project-Manager": {
    title: "Certified Project Manager",
    slug: "Certified-Project-Manager",
    type: "standalone",
    description: "AGI's Certified Project Manager program equips you with the advanced skills needed to manage projects effectively acros.",
    modules: [
      {
        title: "Project Management Overview and Frameworks",
        videos: [
          {
            title: "Project Management Organizational Structures",
            duration: 4,
            url: "https://www.youtube.com/watch?v=Ocm4kvLx6d4",
          }
        ],
        documents: [
          {
            title: "Project Management Page 20-34",
            url: "https://drive.google.com/file/d/1WT1GEFNXJ3_y1yeU1L-mqaTtSqeH-RrX/preview"
          },
          {
            title: "Project Management Overview and Frameworks",
            url: "https://drive.google.com/file/d/1IIWkclbsyVpCIsHjt1K36SBgjqeBGWix/preview"
          }
        ],
      },
      {
        title: "Project Initiation and Business Case Development",
        videos: [
          {
            title: "What Is A Business Case?",
            duration: 5,
            url: "https://www.youtube.com/watch?v=v7m_g1WLYg4",
          },
          {
            title: "Project Charter Guide [HOW TO WRITE A PROJECT MANAGEMENT CHARTER]",
            duration: 10,
            url: "https://www.youtube.com/watch?v=FIPeKqrvNCs",
          }
        ],
        documents: [
          {
            title: "Guide to Developing the Project-Business case",
            url: "https://drive.google.com/file/d/10OoShiXra57FrFmKWNxmY_RpF0q0mLE3/preview"
          },
          {
            title: "Project Initiation and Business Case Development",
            url: "https://drive.google.com/file/d/13OzOJhgyK1zlXziVjr2Kt0fadVdmrvw7/preview"
          }
        ],
      },
      {
        title: "Saving your company and saving your planet",
        videos: [
          {
            title: "What is Stakeholder Management? Project Management in Under 5 min",
            duration: 5,
            url: "https://www.youtube.com/watch?v=-tNHplQ_-hw",
          }
        ],
        documents: [
          {
            title: "PMBOK 7th Edition (iBIMOne.com) page8-15",
            url: "https://drive.google.com/file/d/147LI_rM-xyK_-thlclMO7fPJPXm0Iixk/preview"
          },
          {
            title: "Project Stakeholder Management",
            url: "https://drive.google.com/file/d/19ezSxoCSB1nl3cfYUnWDfTR00T_B6uES/preview"
          }
        ],
      },
      {
        title: "Project Schedule Management",
        videos: [
          {
            title: "What is Cost Management? | Project Management",
            duration: 40,
            url: "https://www.youtube.com/watch?v=FID1uV3Xcxo",
          },
          {
            title: "What is Earned Value Management? | EVM | CV, SV, CPI, SPI, EAC, ETC, TCPI, VAC",
            duration: 31,
            url: "https://www.youtube.com/watch?v=7qGUyTfjWCw",
          }
        ],
        documents: [
          {
            title: "Project Management Page 166-183",
            url: "https://drive.google.com/file/d/1B-Z1QtK6bl0YhBzqdR0iXiVXA2jGitO7/preview"
          },
          {
            title: "Project Cost Management",
            url: "https://drive.google.com/file/d/1nmw5taTqU0HEEntvs9mCCSW1F3LH25rP/preview"
          }
        ],
      },
      {
        title: "The Basics of Project Cost Management",
        videos: [
          {
            title: "The Basics of Project Cost Management - Project Management Training",
            duration: 38,
            url: "https://www.youtube.com/watch?v=ckKHYKJQ-Cw",
          },
          {
            title: "Lean Six Sigma Project Example with DMAIC",
            duration: 20,
            url: "https://www.youtube.com/watch?v=lg_pm9Ziquw",
          },
          {
            title: "ISO Standard Explained | What is ISO | Benefits of getting ISO certified | How to get ISO Certified?",
            duration: 12,
            url: "https://www.youtube.com/watch?v=MIssDGB7pJc&t=114s",
          },
          {
            title: "CertMike Explains Capability Maturity Model Integration (CMMI)",
            duration: 5,
            url: "https://www.youtube.com/watch?v=w5wwwEUf_iA",
          },
          {
            title: "What Is Lean Project Management?",
            duration: 6,
            url: "https://www.youtube.com/watch?v=Pp8-ahZQlLA",
          }
        ],
        documents: [
          {
            title: "Project Management page 197-210",
            url: "https://drive.google.com/file/d/19OMUyxU6ryt1Qoo7jB9RW9jE_WPwnbf2/preview"
          },
          {
            title: "Project Quality Management",
            url: "https://drive.google.com/file/d/1tssTo7r1iCfdViRP-UgsmganbNRH2PUF/preview"
          }
        ],
      },
      {
        title: "Project Resource Management",
        videos: [
          {
            title: "Project Resource Management 101: A Broad Survey of Project Resources",
            duration: 15,
            url: "https://www.youtube.com/watch?v=JfyiMsBV0Z4",
          },
          {
            title: "Daniel Pink and Motivation 3.0 - Content Models of Motivation",
            duration: 10,
            url: "https://www.youtube.com/watch?v=5A5vxXwv92Q",
          }
        ],
        documents: [
          {
            title: "Project Management page 130-165",
            url: "https://drive.google.com/file/d/16xFoHszn9fW7YeWDyKHwUqzMlUqJmSze/preview"
          },
          {
            title: "Project Resource Management",
            url: "https://drive.google.com/file/d/1D_W1cEwDwdnbxNBbCF6s_2el8JCO_F4R/preview"
          }
        ],
      },
      {
        title: "Project Risk Management",
        videos: [
          {
            title: "Project Risk Management - How to Manage Project Risk",
            duration: 11,
            url: "https://www.youtube.com/watch?v=xXV_gjtXMSk",
          },
          {
            title: "Contingency Plans and Fallback Plans: What's the Difference?",
            duration: 5,
            url: "https://www.youtube.com/watch?v=ZTdawTTTTr8",
          }
        ],
        documents: [
          {
            title: "Project Management page 218-230",
            url: "https://drive.google.com/file/d/1sWW6PYN7VUMQDn87RDVUetGiifV8uBBT/preview"
          },
          {
            title: "Project Risk Management",
            url: "https://drive.google.com/file/d/1236RIdHxENRxVUqU4rEmHsXTuUSQ6uDE/preview"
          }
        ],
      },
      {
        title: "Project Communications Management",
        videos: [
          {
            title: "Project Procurement Management",
            duration: 48,
            url: "https://www.youtube.com/watch?v=gOYNM3lvR9c",
          }
        ],
        documents: [
          {
            title: "Project Management page 184-196",
            url: "https://drive.google.com/file/d/18T209zOyjgCLU0IZlNfyeywy4pX4WbuC/preview"
          },
          {
            title: "Project Procurement Management",
            url: "https://drive.google.com/file/d/1rJxrL-I7EVri8FfXdUjIS5Vzskn4zK6a/preview"
          }
        ],
      },
      {
        title: "Agile Frameworks and Methodologies",
        videos: [
          {
            title: "Agile Frameworks | Scrum | Kanban | Lean | XP",
            duration: 20,
            url: "https://www.youtube.com/watch?v=fnlXe9cbols",
          },
          {
            title: "What is Agile? - An Overview",
            duration: 9,
            url: "https://www.youtube.com/watch?v=vYI7-UD9tEQ",
          }
        ],
        documents: [
          {
            title: "Introducing Project Management Frameworks",
            url: "https://drive.google.com/file/d/10M5Fgn6zpXrvomo2ANWCJ7BeJt_t4Gjq/preview"
          },
          {
            title: "Agile Frameworks and Methodologies",
            url: "https://drive.google.com/file/d/1OwoR8RpfmUPRdEarewoL4RLeT7CdRlyE/preview"
          }
        ],
      },
      {
        title: "Project Leadership and Professional Responsibility",
        videos: [
          {
            title: "Five Project Leadership Tips: Be a Better Project Leader",
            duration: 10,
            url: "https://www.youtube.com/watch?v=8ck0yFdcns4",
          },
          {
            title: "Leadership Models Project Managers Need to Know",
            duration: 11,
            url: "https://www.youtube.com/watch?v=3j-OqiC29BU",
          }
        ],
        documents: [
          {
            title: "PMBOK 7th Edition 16-31 page",
            url: "https://drive.google.com/file/d/1ZM0Bf0Efiq_PCL1Bt4qLrqGjTqDjiyql/preview"
          },
          {
            title: "Project Leadership and Professional Responsibility",
            url: "https://drive.google.com/file/d/1_baXTaM8Axai5D7TKE5iS6bbW96u96Yh/preview"
          }
        ],
      },
      {
        title: "AI in Project Management",
        videos: [
          {
            title: "Generative AI for Project Managers - Learn the applications in project management",
            duration: 37,
            url: "https://www.youtube.com/watch?v=1jtJYo4m6EQ",
          }
        ],
        documents: [
          {
            title: "Community-Led AI and Project Management Report",
            url: "https://drive.google.com/file/d/19iZTOWApE_9OSoUF-O8E5P9SwQu3wxaZ/preview"
          },
          {
            title: "AI in Project Management",
            url: "https://drive.google.com/file/d/1b95398FJAyo30yaqT73X0SLVL48k4gjA/preview"
          }
        ],
      }
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  },
  "Certified-Project-Management-Professional": {
    title: "Certified Project Management Professional",
    slug: "Certified-Project-Management-Professional",
    type: "standalone",
    description: "Lead projects with confidence through CPMP certification, mastering project planning, risk management, and leadership skills to excel in project management roles across industries.",
    modules: [
      {
        title: "Strategic Delivery Capability",
        videos: [
          {
            title: "Build Your Organization's Strategic Project Management Capability",
            duration: 57,
            url: "https://www.youtube.com/watch?v=cKJRN51UYMM",
          }
        ],
        documents: [
          {
            title: "Project Management",
            url: "https://drive.google.com/file/d/17Qr3AGqeb4IeIauyhSELAI2O6S7yDEBZ/preview"
          },
          {
            title: "Project Management Fundamentals and Lifecycle",
            url: "https://drive.google.com/file/d/1L8hUxqPqL2z4tdPnm6s_TU8QpyXzsw24/preview"
          }
        ],
      },
      {
        title: "Project Management Empowers Humanitarian and Social Missions",
        videos: [
          {
            title: "Project Initiation | Project Management Life Cycle | Invensis Learning",
            duration: 21,
            url: "https://www.youtube.com/watch?v=hIhTtzo0eBg",
          },
          {
            title: "Stakeholder Engagement Tips: 5 Tips For Project Managers",
            duration: 9,
            url: "https://www.youtube.com/watch?v=APc9S_8v7YY",
          }
        ],
        documents: [
          {
            title: "Project Management page 58-93",
            url: "https://drive.google.com/file/d/17Kawz9YpvHhb0L7PJH2RgM_SFjLvbr9M/preview"
          },
          {
            title: "Project Initiation and Stakeholder Engagement",
            url: "https://drive.google.com/file/d/1FcMX1hldPtuh9VHcgru-m0dlcoLFvGjP/preview"
          }
        ],
      },
      {
        title: "Project Management is Creating Innovative Culture",
        videos: [
          {
            title: "What is Project Scope? Project Management in Under 5",
            duration: 3,
            url: "https://www.youtube.com/watch?v=NXw0bvvYWYo",
          },
          {
            title: "How to Create a Work Breakdown Structure: A WBS Masterclass",
            duration: 14,
            url: "https://www.youtube.com/watch?v=PyR2VLP3xnA",
          }
        ],
        documents: [
          {
            title: "Project_Management_page 94-112",
            url: "https://drive.google.com/file/d/1uGDt842M2cEVq2BwX11e8kPX_qDrAprr/preview"
          },
          {
            title: "Project Planning Scope Definition and Management",
            url: "https://drive.google.com/file/d/1f8NBm3-xCdjwwo79bP1zTTBZTgTa3T3q/preview"
          }
        ],
      },
      {
        title: "Digitization is Central to Delivering Projects",
        videos: [
          {
            title: "How to Create a Project Schedule - 21 Steps in 5 Stages",
            duration: 8,
            url: "https://www.youtube.com/watch?v=e8SMojtawLs",
          },
          {
            title: "Project Scheduling - PERT/CPM | Finding Critical Path",
            duration: 7,
            url: "https://www.youtube.com/watch?v=-TDh-5n90vk",
          }
        ],
        documents: [
          {
            title: "Project_Management_page 113-129",
            url: "https://drive.google.com/file/d/14pgzVv76EINbtRRIUviLyxLvruzHDSCq/preview"
          },
          {
            title: "Project Planning Schedule Development and Control",
            url: "https://drive.google.com/file/d/1rq-98k8bWgXTcIRMzEwzC-CAXjmEAEPL/preview"
          }
        ],
      },
      {
        title: "Evolving Project Manager's Skills",
        videos: [
          {
            title: "Project Cost Management Briefing (Video Compilation)",
            duration: 50,
            url: "https://www.youtube.com/watch?v=d3mXvVnj3qc",
          }
        ],
        documents: [
          {
            title: "Project Management page 166-183",
            url: "https://drive.google.com/file/d/1YYhIpfpQLNDE4tnt85o1VKafTv7r06fn/preview"
          },
          {
            title: "Project Planning Cost Estimation and Budgeting",
            url: "https://drive.google.com/file/d/1hExJJMXKagWzaglA67BfF6K_CI51knGR/preview"
          }
        ],
      },
      {
        title: "New Forms Of Project Leadership",
        videos: [
          {
            title: "Project Quality Management 101 - Your Ultimate Introduction",
            duration: 8,
            url: "https://www.youtube.com/watch?v=1rQT1R3S2BQ",
          }
        ],
        documents: [
          {
            title: "Project Management Page 197-210",
            url: "https://drive.google.com/file/d/1I9wrHX05Hy_LbU5SqHTdw2UP9aUwQpv5/preview"
          },
          {
            title: "Project Quality and Process Improvement",
            url: "https://drive.google.com/file/d/1qx5BJ7rwSQ4TTfiTYuQngpdyQ64U7zOF/preview"
          }
        ],
      },
      {
        title: "Organizational Cultural Shift To The Project Way Of Working",
        videos: [
          {
            title: "Project Resource Management 101: A Broad Survey of Project Resources",
            duration: 15,
            url: "https://www.youtube.com/watch?v=JfyiMsBV0Z4",
          },
          {
            title: "Must-Know Tips for Resource Allocation in Project Management",
            duration: 10,
            url: "https://www.youtube.com/watch?v=N_UbPsGrOUI",
          }
        ],
        documents: [
          {
            title: "Project Management Page 130-165",
            url: "https://drive.google.com/file/d/1QvExNKPquD7vYNuzXavz5ybj4u2G-ZWi/preview"
          },
          {
            title: "Project Resource Management and Team Leadership",
            url: "https://drive.google.com/file/d/159HAAQvzhqaA556WdsmOTaSeQR7Tketk/preview"
          }
        ],
      },
      {
        title: "Project Communication and Information Management",
        videos: [
          {
            title: "Project Communications 101 - the Basics of Project Communication Management",
            duration: 17,
            url: "https://www.youtube.com/watch?v=HOAA8O6zY6Y",
          }
        ],
        documents: [
          {
            title: "Project Management Page 211-217",
            url: "https://drive.google.com/file/d/18pP1kyG87pEsaih1YNWqKgOKrNt00UD0/preview"
          },
          {
            title: "Project Communication and Information Management",
            url: "https://drive.google.com/file/d/19UUtkJNWlD8_n48YPHqKxjKx1QPsuLly/preview"
          }
        ],
      },
      {
        title: "Evolving Nature of PMOs And Governance",
        videos: [
          {
            title: "Project Risk Management - How to Manage Project Risk ",
            duration: 11,
            url: "https://www.youtube.com/watch?v=xXV_gjtXMSk",
          }
        ],
        documents: [
          {
            title: "Project Management Page 218-230",
            url: "https://drive.google.com/file/d/1-8sdMcStdEsUuboeu5B19B8z5ZoLTW8r/preview"
          },
          {
            title: "Project Risk and Issue Management",
            url: "https://drive.google.com/file/d/1_UeG9cgoL7SBw80Welkdp45JAzkzzNnt/preview"
          }
        ],
      },
      {
        title: "Project Procurement and Contract Administration",
        videos: [
          {
            title: "Contract Management in Project Management A Comprehensive Guide",
            duration: 7,
            url: "https://www.youtube.com/watch?v=LM-bFKlOoIs",
          },
          {
            title: "Procurement Management 101",
            duration: 16,
            url: "https://www.youtube.com/watch?v=bPgheptnmWs",
          }
        ],
        documents: [
          {
            title: "Project Management Page 184-196",
            url: "https://drive.google.com/file/d/1x3lHhptu8NQJMapPG1OKahV19rfHygVR/preview"
          }
        ],
      },
      {
        title: "AI in Project Management",
        videos: [
          {
            title: "Generative AI for Project Managers - Learn the applications in project management",
            duration: 36,
            url: "https://www.youtube.com/watch?v=1jtJYo4m6EQ",
          }
        ],
        documents: [
          {
            title: "Community-Led AI and Project Management Report",
            url: "https://drive.google.com/file/d/19Jeuv27SwjZ-JZQF8E9rhtFJM-enUUrA/preview"
          },
          {
            title: "AI in Project Management",
            url: "https://drive.google.com/file/d/1jykbo07uRYBknDrfniovxhVkCGh7z70Z/preview"
          }
        ],
      }
    ],
    liveClassConfig: {
      enabled: true,
      frequency: "weekly",
      dayOfWeek: "Wednesday",
      durationMin: 60,
    }
  }
};

// Quiz questions mapping for each course/module
const quizQuestionsMapping: {
  [courseSlug: string]: { [moduleIndex: number]: Array<{ prompt: string, options: string[], correctIndex: number }> }
} = {
  "certified-supply-chain-professional": {
    0: [
      {
        prompt: "What is the primary goal of supply chain management?",
        options: [
          "To maximize profits by minimizing costs and meeting customer demand",
          "To increase the number of suppliers",
          "To reduce the number of products",
          "To eliminate inventory"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which of the following best describes procurement?",
        options: [
          "Acquiring goods and services from external sources",
          "Shipping finished goods to customers",
          "Managing inventory levels",
          "Scheduling production runs"
        ],
        correctIndex: 0
      },
      {
        prompt: "Supplier management involves:",
        options: [
          "Selecting, evaluating, and developing supplier relationships",
          "Only negotiating prices",
          "Focusing solely on quality control",
          "Delivering products to end customers"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which activity is NOT a part of supply chain fundamentals?",
        options: [
          "Product advertising",
          "Procurement",
          "Logistics",
          "Inventory management"
        ],
        correctIndex: 0
      },
      {
        prompt: "A key challenge in supply chain management is:",
        options: [
          "Balancing cost, quality, and delivery time",
          "Increasing the number of employees",
          "Reducing the number of suppliers to zero",
          "Focusing only on one function"
        ],
        correctIndex: 0
      }
    ],
    1: [
      {
        prompt: "What is the main objective of inventory management?",
        options: [
          "To maintain optimal stock levels to meet demand while minimizing costs",
          "To eliminate all inventory",
          "To maximize warehouse space",
          "To increase the number of SKUs"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which of the following is a production and operations management activity?",
        options: [
          "Scheduling manufacturing processes",
          "Setting marketing budgets",
          "Hiring sales staff",
          "Designing advertisements"
        ],
        correctIndex: 0
      },
      {
        prompt: "A Just-In-Time (JIT) system aims to:",
        options: [
          "Reduce inventory and improve efficiency",
          "Increase inventory levels",
          "Lengthen production cycles",
          "Expand product lines"
        ],
        correctIndex: 0
      },
      {
        prompt: "Safety stock is held to:",
        options: [
          "Protect against uncertainties in demand or supply",
          "Increase costs",
          "Reduce product variety",
          "Facilitate marketing campaigns"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which is NOT a benefit of effective operations management?",
        options: [
          "Higher advertising spend",
          "Improved efficiency",
          "Better resource utilization",
          "Lower operating costs"
        ],
        correctIndex: 0
      }
    ],
    2: [
      {
        prompt: "Logistics primarily involves:",
        options: [
          "Transportation, warehousing, and distribution of goods",
          "Product design",
          "Employee training",
          "Market research"
        ],
        correctIndex: 0
      },
      {
        prompt: "Distribution management focuses on:",
        options: [
          "Delivering products to the right place, at the right time, in the right quantity",
          "Hiring new staff",
          "Designing new products",
          "Increasing marketing spend"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which of the following is a key logistics performance metric?",
        options: [
          "On-time delivery rate",
          "Number of advertisements",
          "Employee turnover",
          "Website traffic"
        ],
        correctIndex: 0
      },
      {
        prompt: "A distribution center is used for:",
        options: [
          "Storing and shipping products to customers or retailers",
          "Product development",
          "Recruitment",
          "Financial auditing"
        ],
        correctIndex: 0
      },
      {
        prompt: "Reverse logistics refers to:",
        options: [
          "Managing returns and recycling of products",
          "Backward planning of marketing campaigns",
          "Reducing forward shipments",
          "Increasing inventory"
        ],
        correctIndex: 0
      }
    ],
    3: [
      {
        prompt: "Supply chain risk management involves:",
        options: [
          "Identifying, assessing, and mitigating risks across the supply chain",
          "Hiring more salespeople",
          "Increasing production volume",
          "Reducing marketing budget"
        ],
        correctIndex: 0
      },
      {
        prompt: "A lean supply chain strategy focuses on:",
        options: [
          "Eliminating waste and increasing efficiency",
          "Adding more suppliers",
          "Increasing inventory",
          "Reducing product quality"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which is an example of supply chain risk?",
        options: [
          "Supplier bankruptcy",
          "Product innovation",
          "Increasing sales",
          "Launching a marketing campaign"
        ],
        correctIndex: 0
      },
      {
        prompt: "Agile supply chain strategies are best for:",
        options: [
          "Responding quickly to changing market demands",
          "Reducing communication",
          "Focusing on one supplier",
          "Eliminating all inventory"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which tool is commonly used for risk assessment?",
        options: [
          "Risk matrix",
          "Profit and loss statement",
          "Sales forecast",
          "Advertising plan"
        ],
        correctIndex: 0
      }
    ],
    4: [
      {
        prompt: "Strategic sourcing in supply chain means:",
        options: [
          "Proactively managing procurement to optimize value",
          "Buying only from local suppliers",
          "Reducing supplier diversity",
          "Increasing advertising"
        ],
        correctIndex: 0
      },
      {
        prompt: "Global procurement involves:",
        options: [
          "Sourcing goods and services from international suppliers",
          "Hiring only local employees",
          "Focusing only on domestic markets",
          "Reducing product lines"
        ],
        correctIndex: 0
      },
      {
        prompt: "Technology in supply chain management helps to:",
        options: [
          "Improve visibility, efficiency, and coordination",
          "Increase paperwork",
          "Reduce automation",
          "Limit communication"
        ],
        correctIndex: 0
      },
      {
        prompt: "Sustainability in supply chain refers to:",
        options: [
          "Practices that consider environmental and social impacts",
          "Maximizing waste",
          "Ignoring regulations",
          "Reducing supplier collaboration"
        ],
        correctIndex: 0
      },
      {
        prompt: "Ethics in supply chain means:",
        options: [
          "Conducting business honestly, fairly, and responsibly",
          "Focusing only on profits",
          "Avoiding transparency",
          "Reducing product quality"
        ],
        correctIndex: 0
      }
    ]
  },
  "Accounting-and-Finance": {
    0: [
      {
        prompt: "Which of the following is NOT a key reason why accounting is essential?",
        options: [
          "Financial Tracking & Decision-Making",
          "Legal & Regulatory Compliance",
          "Budgeting & Financial Planning",
          "Increasing employee salaries"
        ],
        correctIndex: 3
      },
      {
        prompt: "According to the text, what is accounting?",
        options: [
          "The process of preparing tax returns",
          "The process of recording, summarizing, analyzing, and reporting financial transactions.",
          "A set of rules for maximizing profits",
          "A method for avoiding legal and regulatory compliance."
        ],
        correctIndex: 1
      },
      {
        prompt: "Which accounting principle states that transactions are recorded when they occur, not when cash is received or paid?  ",
        options: [
          "Consistency Principle",
          "Accrual Principle",
          "Matching Principle",
          "Revenue Recognition Principle"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the following is a key difference between GAAP and IFRS regarding inventory valuation?",
        options: [
          "GAAP allows LIFO, while IFRS does not",
          "IFRS allows LIFO, while GAAP does not. ",
          "Both GAAP and IFRS allow LIFO",
          "Neither GAAP nor IFRS allows LIFO."
        ],
        correctIndex: 0
      },
      {
        prompt: "What is the Going Concern Principle?",
        options: [
          "Assets are recorded at their current market value.",
          "Expenses should be recorded in the same period as the revenues they help generate.",
          "A business is assumed to operate indefinitely unless there is evidence to suggest otherwise. ",
          "Revenue is recognized when cash is received."
        ],
        correctIndex: 2
      }
    ],
    1: [
      {
        prompt: "Which of the following is the correct accounting equation?",
        options: [
          "Assets = Liabilities - Equity",
          "Assets = Equity - Liabilities",
          "Assets = Liabilities + Equity",
          "Equity = Assets + Liabilities"
        ],
        correctIndex: 2   // c) Assets = Liabilities + Equity
      },
      {
        prompt: "What type of account is debited when closing revenue accounts?",
        options: [
          "Expense Accounts",
          "Income Summary Account",
          "Retained Earnings",
          "Drawings Account"
        ],
        correctIndex: 1   // b) Income Summary Account
      },
      {
        prompt: "Which financial statement reports a company's financial performance over a period of time?",
        options: [
          "Balance Sheet",
          "Cash Flow Statement",
          "Income Statement",
          "Statement of Changes in Equity"
        ],
        correctIndex: 2   // c) Income Statement
      },
      {
        prompt: "Which of the following is an example of a current asset?",
        options: [
          "Property",
          "Equipment",
          "Cash",
          "Long-term loans"
        ],
        correctIndex: 2   // c) Cash
      },
      {
        prompt: "What is the purpose of a bank reconciliation?",
        options: [
          "To prepare financial statements",
          "To detect errors, fraud, or omissions",
          "To record journal entries",
          "To calculate depreciation"
        ],
        correctIndex: 1   // b) Detect errors, fraud, or omissions
      },
      {
        prompt: "Which inventory valuation method assumes that the newest products are sold first?",
        options: [
          "FIFO",
          "LIFO",
          "Weighted Average",
          "Specific Identification"
        ],
        correctIndex: 1   // b) LIFO
      },
      {
        prompt: "What is the first step in the accounting cycle?",
        options: [
          "Preparing a trial balance",
          "Recording transactions in a journal",
          "Identifying transactions",
          "Posting entries to the ledger"
        ],
        correctIndex: 2   // c) Identifying transactions
      },
      {
        prompt: "Which depreciation method calculates depreciation expense by multiplying the cost of the asset by a depreciation rate?",
        options: [
          "Straight-Line Depreciation",
          "Double-Declining Balance Depreciation",
          "Units-of-Production Depreciation",
          "Sum-of-the-Years' Digits Depreciation"
        ],
        correctIndex: 1   // b) Double-Declining Balance
      },
      {
        prompt: "Which of the following is a key component of the Cash Flow Statement?",
        options: [
          "Revenue",
          "Liabilities",
          "Operating Activities",
          "Equity"
        ],
        correctIndex: 2   // c) Operating Activities
      },
      {
        prompt: "What is the purpose of closing entries in the accounting cycle?",
        options: [
          "To record daily transactions",
          "To adjust account balances",
          "To reset temporary accounts to zero",
          "To prepare the balance sheet"
        ],
        correctIndex: 2   // c) Reset temporary accounts to zero
      }
    ],
    2: [
      {
        prompt: "Which category of ratios is used to assess a company's ability to meet its short-term obligations?",
        options: [
          "Profitability Ratios",
          "Liquidity Ratios",
          "Efficiency Ratios",
          "Solvency Ratios"
        ],
        correctIndex: 1    // Liquidity Ratios
      },
      {
        prompt: "The Current Ratio is calculated as:",
        options: [
          "(Current Assets - Inventory) / Current Liabilities",
          "Current Assets / Current Liabilities",
          "Cash and Cash Equivalents / Current Liabilities",
          "Net Income / Revenue"
        ],
        correctIndex: 1    // Current Assets / Current Liabilities
      },
      {
        prompt: "What does a high Inventory Turnover Ratio suggest?",
        options: [
          "Inefficient inventory management",
          "Excess stock",
          "Strong sales and efficient inventory management",
          "Weak demand"
        ],
        correctIndex: 2    // Strong sales and efficient inventory management
      },
      {
        prompt: "Which ratio measures a company's ability to generate profit from its assets?",
        options: [
          "Gross Profit Margin",
          "Net Profit Margin",
          "Return on Equity (ROE)",
          "Return on Assets (ROA)"
        ],
        correctIndex: 3    // Return on Assets (ROA)
      },
      {
        prompt: "A high Debt-to-Equity Ratio indicates:",
        options: [
          "Lower financial risk",
          "More reliance on equity",
          "More reliance on debt",
          "Stable company"
        ],
        correctIndex: 2    // More reliance on debt
      },
      {
        prompt: "Which ratio is used to assess a company's stock valuation in the market?",
        options: [
          "Solvency Ratio",
          "Efficiency Ratio",
          "Market Ratio",
          "Liquidity Ratio"
        ],
        correctIndex: 2    // Market Ratio
      },
      {
        prompt: "The Price-to-Earnings (P/E) Ratio is calculated as:",
        options: [
          "Market Capitalization / Total Revenue",
          "Market Price per Share / Book Value per Share",
          "Market Price per Share / Earnings per Share",
          "Annual Dividends per Share / Market Price per Share"
        ],
        correctIndex: 2    // Market Price per Share / Earnings per Share
      },
      {
        prompt: "What does DuPont Analysis help to identify?",
        options: [
          "Short-term liquidity",
          "Long-term solvency",
          "Drivers of Return on Equity (ROE)",
          "Market valuation"
        ],
        correctIndex: 2    // Drivers of ROE
      },
      {
        prompt: "Which of the following is NOT a key component of the DuPont Analysis?",
        options: [
          "Net Profit Margin",
          "Asset Turnover",
          "Debt-to-Equity Ratio",
          "Equity Multiplier"
        ],
        correctIndex: 2    // Debt-to-Equity Ratio
      },
      {
        prompt: "What does a high Price-to-Sales (P/S) ratio suggest?",
        options: [
          "Undervalued stock",
          "Growth potential",
          "Financial instability",
          "Low revenue"
        ],
        correctIndex: 1    // Growth potential
      }
    ],
    3: [
      {
        prompt: "Which of the following is NOT a key principle of corporate governance?",
        options: [
          "Accountability",
          "Transparency",
          "Fairness",
          "Profit Maximization"
        ],
        correctIndex: 3   // d) Profit Maximization
      },
      {
        prompt: "What does financial fraud involve?",
        options: [
          "Applying moral principles in business.",
          "Intentional misrepresentation of financial information.",
          "Establishing strong internal controls.",
          "Complying with IFRS and GAAP."
        ],
        correctIndex: 1   // b) Intentional misrepresentation …
      },
      {
        prompt: "The Sarbanes-Oxley Act (SOX) was a reform in response to which accounting scandal?",
        options: [
          "WorldCom",
          "Wirecard",
          "Enron",
          "All of the above"
        ],
        correctIndex: 2   // c) Enron
      },
      {
        prompt: "Which of the following is an example of a preventive internal control?",
        options: [
          "Reconciliations",
          "Audits",
          "Segregation of duties",
          "Backup data systems"
        ],
        correctIndex: 2   // c) Segregation of duties
      },
      {
        prompt: "What is the primary focus of IFRS?",
        options: [
          "Rules-based standards",
          "Principles-based standards",
          "Historical cost accounting",
          "Local regulations"
        ],
        correctIndex: 1   // b) Principles-based standards
      }
    ],
    4: [
      {
        prompt: "Which of the following is a core principle of the Time Value of Money (TVM)?",
        options: [
          "Risk is irrelevant in financial decisions",
          "Money is worth the same today and in the future",
          "A sum of money is worth more today than the same amount in the future",
          "Inflation has no impact on the value of money"
        ],
        correctIndex: 2   // c) A sum of money is worth more today …
      },
      {
        prompt: "What does Present Value (PV) represent?",
        options: [
          "The future worth of a sum of money",
          "The current worth of a future sum of money",
          "The interest rate",
          "The inflation rate"
        ],
        correctIndex: 1   // b) The current worth of a future sum of money
      },
      {
        prompt: "Higher interest rates will:",
        options: [
          "Decrease future value",
          "Increase present value",
          "Increase future value",
          "Have no effect on the time value of money"
        ],
        correctIndex: 2   // c) Increase future value
      },
      {
        prompt: "Which of the following is NOT a type of financial risk?",
        options: [
          "Market risk",
          "Credit risk",
          "Operational risk",
          "Weather risk"
        ],
        correctIndex: 3   // d) Weather risk
      },
      {
        prompt: "Beta (β) measures:",
        options: [
          "The volatility of returns",
          "Stock risk compared to the market",
          "Potential losses",
          "Inflation risk"
        ],
        correctIndex: 1   // b) Stock risk compared to the market
      },
      {
        prompt: "Return on Equity (ROE) evaluates profitability relative to:",
        options: [
          "Total assets",
          "Sales revenue",
          "Shareholders' equity",
          "Debt"
        ],
        correctIndex: 2   // c) Shareholders' equity
      },
      {
        prompt: "If Economic Value Added (EVA) is greater than 0, it means:",
        options: [
          "The company is destroying value",
          "The company is breaking even",
          "The company is creating value",
          "The company's capital costs are too high"
        ],
        correctIndex: 2   // c) The company is creating value
      }
    ],
    5: [
      {
        prompt: "What is the primary goal of capital budgeting?",
        options: [
          "Minimizing expenses",
          "Maximizing shareholder value",
          "Increasing sales",
          "Reducing debt"
        ],
        correctIndex: 1   // b) Maximizing shareholder value
      },
      {
        prompt: "If the Net Present Value (NPV) of a project is positive, should you accept or reject it?",
        options: [
          "Accept",
          "Reject",
          "It depends on the payback period",
          "It depends on the IRR"
        ],
        correctIndex: 0   // a) Accept
      },
      {
        prompt: "What does the Internal Rate of Return (IRR) represent?",
        options: [
          "The initial investment",
          "The project's expected return",
          "The discount rate",
          "The payback period"
        ],
        correctIndex: 1   // b) The project's expected return
      },
      {
        prompt: "The payback period measures:",
        options: [
          "The profitability of a project",
          "The risk of a project",
          "The time to recover the initial investment",
          "The present value of cash inflows"
        ],
        correctIndex: 2   // c) Time to recover the initial investment
      },
      {
        prompt: "What does a Profitability Index (PI) greater than 1 indicate?",
        options: [
          "The project should be rejected",
          "The project is profitable",
          "The project is breaking even",
          "The project's NPV is negative"
        ],
        correctIndex: 1   // b) The project is profitable
      },
      {
        prompt: "In the Capital Budgeting Analysis example, what was the decision regarding the expansion of a manufacturing plant?",
        options: [
          "Proceed with the expansion",
          "Reject the expansion",
          "Postpone the decision",
          "Seek more information"
        ],
        correctIndex: 0   // a) Proceed with the expansion
      },
      {
        prompt: "Which of the following is NOT a tip for realistic revenue and cash-flow projections?",
        options: [
          "Base assumptions on market research",
          "Be optimistic in revenue estimates",
          "Consider payment delays",
          "Include contingencies for unexpected costs"
        ],
        correctIndex: 1   // b) Be optimistic in revenue estimates
      }
    ],
    6: [
      {
        prompt: "Which of the following is an internal source of finance?",
        options: [
          "Bank loans",
          "Corporate bonds",
          "Retained earnings",
          "Venture capital"
        ],
        correctIndex: 2   // c) Retained earnings
      },
      {
        prompt: "What is a disadvantage of debt financing?",
        options: [
          "Dilution of ownership",
          "No repayment obligation",
          "Tax-deductible interest payments",
          "Requirement for collateral"
        ],
        correctIndex: 3   // d) Requirement for collateral
      },
      {
        prompt: "Equity financing involves:",
        options: [
          "Borrowing money",
          "Selling ownership in the company",
          "Leasing assets",
          "Using retained earnings"
        ],
        correctIndex: 1   // b) Selling ownership in the company
      },
      {
        prompt: "What is a key characteristic of venture capital?",
        options: [
          "Investment in mature companies",
          "No ownership dilution",
          "Investment in high-growth startups",
          "Low-risk investment"
        ],
        correctIndex: 2   // c) Investment in high-growth startups
      },
      {
        prompt: "What does WACC represent?",
        options: [
          "The cost of equity",
          "The cost of debt",
          "A firm's blended cost of capital",
          "The company's profit margin"
        ],
        correctIndex: 2   // c) Blended cost of capital
      },
      {
        prompt: "Which factor is NOT a strategic consideration for choosing a finance source?",
        options: [
          "Cost of capital",
          "Risk tolerance",
          "Employee satisfaction",
          "Business stage"
        ],
        correctIndex: 2   // c) Employee satisfaction
      },
      {
        prompt: "What is a potential challenge of raising funds through venture capital?",
        options: [
          "No access to expertise",
          "No pressure for performance",
          "Loss of control",
          "No dilution of ownership"
        ],
        correctIndex: 2   // c) Loss of control
      }
    ],
    7: [
      {
        prompt: "Which of the following is NOT a common measure of risk?",
        options: [
          "Standard Deviation",
          "Beta Coefficient",
          "Net Present Value (NPV)",
          "Value at Risk (VaR)"
        ],
        correctIndex: 2   // c) NPV
      },
      {
        prompt: "What does a high standard deviation indicate?",
        options: [
          "Lower risk",
          "Higher certainty",
          "Higher risk",
          "Consistent returns"
        ],
        correctIndex: 2   // c) Higher risk
      },
      {
        prompt: "A stock with a beta of 0.8 is:",
        options: [
          "More volatile than the market",
          "Less volatile than the market",
          "As volatile as the market",
          "Inversely related to the market"
        ],
        correctIndex: 1   // b) Less volatile than the market
      },
      {
        prompt: "Value at Risk (VaR) estimates:",
        options: [
          "The average return of an asset",
          "The potential profit of an asset",
          "The worst-case loss over a period",
          "The asset's volatility"
        ],
        correctIndex: 2   // c) Worst-case loss
      },
      {
        prompt: "What does the Capital Asset Pricing Model (CAPM) help to understand?",
        options: [
          "The potential profit of a company",
          "The relationship between risk and return",
          "The company's cash flow",
          "The company's debt ratio"
        ],
        correctIndex: 1   // b) Risk–return relationship
      },
      {
        prompt: "Diversification aims to reduce:",
        options: [
          "Systematic risk",
          "Unsystematic risk",
          "Market risk",
          "Interest rate risk"
        ],
        correctIndex: 1   // b) Unsystematic risk
      },
      {
        prompt: "A Sharpe Ratio greater than 1 indicates:",
        options: [
          "Poor return per unit of risk",
          "Good return per unit of risk",
          "Negative return",
          "No risk"
        ],
        correctIndex: 1   // b) Good return per unit of risk
      }
    ]
  },
  "Certified-Logistics-Manager": {
    0: [
      {
        prompt: "Which transportation mode is characterized by the highest cargo capacity and the lowest cost per ton for long-distance international shipments?",
        options: [
          "Air Transport",
          "Road Transport",
          "Rail Transport",
          "Ocean/Sea Transport"
        ],
        correctIndex: 3
      },
      {
        prompt: "Under which Incoterm does the seller have the maximum responsibility, including handling import clearance and paying duties in the buyer's country?",
        options: [
          "EXW (Ex Works)",
          "FOB (Free On Board)",
          "DDP (Delivered Duty Paid)",
          "CIF (Cost, Insurance & Freight)"
        ],
        correctIndex: 2
      },
      {
        prompt: "The SOLAS (Safety of Life at Sea) convention requires shippers to provide what specific information for containers before they can be loaded onto a vessel?",
        options: [
          "Certificate of Origin (COO)",
          "Verified Gross Mass (VGM)",
          "Commercial Invoice value",
          "The correct Harmonized System (HS) Code"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the key difference between multimodal and intermodal transport?",
        options: [
          "Intermodal transport uses only one mode, while multimodal uses several",
          "Multimodal transport is managed under a single contract, while intermodal involves multiple contracts with different carriers",
          "Intermodal transport is only for domestic shipments, while multimodal is for international",
          "In multimodal transport, the container is never changed, but it can be in intermodal"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which document serves as both a contract of carriage and a document of title for goods shipped via sea freight?",
        options: [
          "Air Waybill (AWB)",
          "Commercial Invoice",
          "Packing List",
          "Bill of Lading (B/L)"
        ],
        correctIndex: 3
      },
      {
        prompt: "A company that acts as a supply chain integrator, strategically overseeing the entire supply chain and managing multiple 3PLs, is known as a:",
        options: [
          "Freight Forwarder",
          "Customs Broker",
          "3PL (Third-Party Logistics Provider)",
          "4PL (Fourth-Party Logistics Provider)"
        ],
        correctIndex: 3
      },
      {
        prompt: "In sea freight, charges for container delays at the port or off-terminal are known as:",
        options: [
          "Fuel Surcharges (BAF/CAF)",
          "Accessorial Charges",
          "Demurrage & Detention",
          "General Rate Increases (GRIs)"
        ],
        correctIndex: 2
      }
    ],
    1: [
      {
        prompt: "What does the \"Order Cycle Time\" KPI measure?",
        options: [
          "The time it takes to process a sales order before fulfillment",
          "The total time from when a customer places an order until it is delivered",
          "The average time a supplier takes to have goods ready for delivery",
          "The frequency at which inventory is sold and replaced"
        ],
        correctIndex: 1
      },
      {
        prompt: "A logistics manager uses a diagram to visually map out all potential causes of delivery delays, organizing them into categories like \"Man,\" \"Machine,\" and \"Method.\" Which analytical tool are they using?",
        options: [
          "Pareto Analysis",
          "Process Flowchart",
          "Fishbone Diagram (Ishikawa)",
          "ABC Inventory Analysis"
        ],
        correctIndex: 2
      },
      {
        prompt: "The \"Inventory Turnover Ratio\" is a key supply KPI. What does a high turnover rate generally indicate?",
        options: [
          "The company is overstocking on inventory",
          "The products are slow-moving or obsolete",
          "The company has poor inventory planning",
          "The company is managing its inventory efficiently"
        ],
        correctIndex: 3
      },
      {
        prompt: "Which type of benchmarking involves comparing your company's logistics KPIs against those of top-performing companies, regardless of their industry?",
        options: [
          "Internal Benchmarking",
          "Competitive Benchmarking",
          "Functional Benchmarking",
          "Best-in-Class Benchmarking"
        ],
        correctIndex: 3
      },
      {
        prompt: "What is the primary purpose of a logistics dashboard?",
        options: [
          "To create a legally binding contract with a carrier",
          "To provide a real-time, visual interface for tracking operational KPIs at a glance",
          "To plan long-term logistics KPIs with strategic company goals",
          "To replace traditional inventory management systems"
        ],
        correctIndex: 1
      }
    ],
    2: [
      {
        prompt: "In Supplier Relationship Management (SRM), what is the process of classifying suppliers based on their value, criticality, and risk called?",
        options: [
          "Performance Management",
          "Collaboration",
          "Segmentation",
          "Development"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which risk assessment tool is specifically used to categorize suppliers into four quadrants: Strategic, Leverage, Bottleneck, and Routine?",
        options: [
          "FMEA (Failure Mode & Effects Analysis)",
          "Kraljic Matrix",
          "SWIFT Analysis",
          "TIER Mapping"
        ],
        correctIndex: 1
      },
      {
        prompt: "In the context of Procurement 4.0, what is Robotic Process Automation (RPA) primarily used for?",
        options: [
          "Predicting future demand for materials",
          "Automating routine, repetitive tasks like PO creation and invoice matching",
          "Tracking the real-time location of shipments using sensors",
          "Providing high-level dashboards for spend visibility"
        ],
        correctIndex: 1
      },
      {
        prompt: "The negotiation framework that involves knowing your \"walk-away point\" by identifying your next best option if the current negotiation fails is known as:",
        options: [
          "TCO (Total Cost of Ownership)",
          "SLA (Service Level Agreement)",
          "BATNA (Best Alternative To a Negotiated Agreement)",
          "KPI (Key Performance Indicator)"
        ],
        correctIndex: 2
      },
      {
        prompt: "Compared to Global Sourcing, what is a primary advantage of Localized Sourcing?",
        options: [
          "Lower unit costs due to labor arbitrage",
          "Longer and more complex supply chains",
          "Shorter, more predictable lead times and higher responsiveness",
          "Greater exposure to geopolitical and currency risks"
        ],
        correctIndex: 2
      },
      {
        prompt: "In ESG-based procurement, the \"Social\" pillar primarily focuses on evaluating a supplier's performance in which area?",
        options: [
          "Carbon emissions and waste management",
          "Ethics, compliance, and anti-corruption policies",
          "Financial stability and profitability",
          "Labor rights, community impact, and diversity"
        ],
        correctIndex: 3
      },
      {
        prompt: "Which clause in an international procurement contract defines the responsibilities for transport, insurance, customs, and the point at which risk transfers from the seller to the buyer?",
        options: [
          "Governing Law",
          "Force Majeure",
          "Jurisdiction",
          "Incoterms"
        ],
        correctIndex: 3
      }
    ],
    3: [
      {
        prompt: "Which leadership style involves adapting your approach by directing, coaching, supporting, or delegating based on the competence and commitment of your team?",
        options: [
          "Trait Leadership",
          "Transformational Leadership",
          "Situational Leadership",
          "Visionary Leadership"
        ],
        correctIndex: 2
      },
      {
        prompt: "According to Daniel Goleman's Emotional Intelligence model, the ability to recognize and understand your own moods, emotions, and their impact on others is known as:",
        options: [
          "Self-Management",
          "Relationship Management",
          "Social Awareness",
          "Self-Awareness"
        ],
        correctIndex: 3
      },
      {
        prompt: "When leading multicultural teams, a direct, fact-based communication style is most effective for which type of culture?",
        options: [
          "High-context cultures (e.g., Asia, Latin America)",
          "Low-context cultures (e.g., US, Germany)",
          "Hierarchical cultures (e.g., India, Japan)",
          "Egalitarian cultures (e.g., Netherlands, Australia)"
        ],
        correctIndex: 1
      },
      {
        prompt: "A logistics manager chooses a slightly more expensive but greener shipping route to reduce long-term CO₂ emissions for the greater good. Which ethical framework is being applied?",
        options: [
          "Deontological Ethics (Duty-Based)",
          "Utilitarianism",
          "Virtue Ethics",
          "Justice & Fairness"
        ],
        correctIndex: 1
      },
      {
        prompt: "A manager tries to gain support for a new technology by stating, \"If we help the IT department with their WMS integration now, they will prioritize our TMS upgrade later.\" Which strategic influence tactic is being used?",
        options: [
          "Social Proof",
          "Scarcity/Urgency",
          "Reciprocity",
          "Framing"
        ],
        correctIndex: 2
      },
      {
        prompt: "A leader who inspires teams to achieve more than expected by creating a shared vision, encouraging innovation, and serving as a role model is demonstrating which leadership style?",
        options: [
          "Situational Leadership",
          "Transformational Leadership",
          "Trait Leadership",
          "Directive Leadership"
        ],
        correctIndex: 1
      },
      {
        prompt: "In the Boeing 737 Max crisis case study, the company's failure to fully disclose the new MCAS system to pilots and airlines was cited as a key ethical failure in what area?",
        options: [
          "Lack of Transparency",
          "Regulatory Capture",
          "Internal Culture of Silence",
          "Post-Crisis Handling"
        ],
        correctIndex: 0
      }
    ],
    4: [
      {
        prompt: "Which of the following typically represents the largest component, often 50-60%, of total logistics costs?",
        options: [
          "Warehousing Costs",
          "Inventory Carrying Costs",
          "Transportation Costs",
          "Administrative & Overhead Costs"
        ],
        correctIndex: 2
      },
      {
        prompt: "In logistics, warehouse rent and the salaries of permanent staff are examples of what type of cost?",
        options: [
          "Variable Costs",
          "Fixed Costs",
          "Inventory Carrying Costs",
          "Last-Mile Delivery Costs"
        ],
        correctIndex: 1
      },
      {
        prompt: "The strategy of transferring goods directly from an inbound truck to an outbound truck with little to no long-term storage is known as:",
        options: [
          "Backhauling",
          "Cross-docking",
          "Load consolidation",
          "Inventory pooling"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which costing method assigns expenses to specific logistics activities (e.g., order picking, loading) to more accurately determine the true cost of serving a particular customer or product?",
        options: [
          "Total Cost of Ownership (TCO)",
          "Activity-Based Costing (ABC)",
          "Fixed Cost Allocation",
          "Variable Cost Analysis"
        ],
        correctIndex: 1
      },
      {
        prompt: "When evaluating a major logistics investment, such as a new warehouse management system (WMS), which financial principle considers all costs over the asset's entire lifecycle, including acquisition, operation, and disposal?",
        options: [
          "Cost-Benefit Analysis (CBA)",
          "Return on Investment (ROI)",
          "Total Cost of Ownership (TCO)",
          "Payback Period"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is a primary advantage of outsourcing logistics to a third-party provider (3PL)?",
        options: [
          "It gives the company full, direct control over all logistics processes",
          "It converts fixed costs (like owning a warehouse) into variable, pay-as-you-go costs",
          "It requires a large upfront capital investment from the company",
          "It is best when logistics is a core strategic competency of the company"
        ],
        correctIndex: 1
      },
      {
        prompt: "The practice of using a vehicle's return journey to carry a new load of freight to avoid traveling empty is called:",
        options: [
          "Cross-docking",
          "Backhauling",
          "Mode shifting",
          "Batch picking"
        ],
        correctIndex: 1
      }
    ],
    5: [
      {
        prompt: "Which quality management philosophy is described as a holistic approach involving all members of an organization to achieve long-term success through customer satisfaction?",
        options: [
          "Six Sigma",
          "ISO 9001",
          "Total Quality Management (TQM)",
          "PDCA (Plan-Do-Check-Act)"
        ],
        correctIndex: 2
      },
      {
        prompt: "In the Six Sigma DMAIC cycle, which phase is focused on identifying the root cause of a problem after data has been collected?",
        options: [
          "Define",
          "Measure",
          "Analyze",
          "Improve"
        ],
        correctIndex: 2
      },
      {
        prompt: "According to the Cost of Quality (CoQ) model, the costs associated with warranty charges and customer returns fall under which category?",
        options: [
          "Prevention Costs",
          "Appraisal Costs",
          "Internal Failure Costs",
          "External Failure Costs"
        ],
        correctIndex: 3
      },
      {
        prompt: "A logistics manager wants to prioritize which issues are causing the most customer complaints. Which quality tool would be most effective for identifying the \"vital few\" causes that lead to the majority of problems (the 80/20 rule)?",
        options: [
          "Flowchart",
          "Check Sheet",
          "Pareto Chart",
          "Fishbone Diagram"
        ],
        correctIndex: 2
      },
      {
        prompt: "According to Kotter's 8-Step Change Model for leading a quality culture transformation, what is the critical first step?",
        options: [
          "Form a guiding coalition",
          "Communicate the vision",
          "Create a sense of urgency",
          "Generate quick wins"
        ],
        correctIndex: 2
      },
      {
        prompt: "Within the ISO 9001 framework, which clause specifically addresses the need for management commitment to quality and customer satisfaction?",
        options: [
          "Clause 4: Context of the Organization",
          "Clause 5: Leadership",
          "Clause 8: Operation",
          "Clause 10: Improvement"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the primary purpose of the EFQM (European Foundation for Quality Management) model in a logistics context?",
        options: [
          "To provide a mandatory set of rules for shipping within the EU",
          "To calculate the precise financial return on investment for quality programs",
          "To serve as a framework for organizational excellence and to benchmark performance",
          "To design the physical layout of a warehouse for maximum efficiency"
        ],
        correctIndex: 2
      }
    ],
    6: [
      {
        prompt: "What is the primary goal of the Economic Order Quantity (EOQ) inventory model?",
        options: [
          "To classify inventory based on its operational criticality",
          "To minimize total inventory cost by balancing ordering costs and holding costs",
          "To receive goods only when they are needed for production",
          "To prioritize inventory management efforts based on value contribution"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which inventory classification method is most suitable for managing critical spare parts, where items are categorized based on their importance to operations (Vital, Essential, Desirable)?",
        options: [
          "ABC Analysis",
          "VED Analysis",
          "Just-In-Time (JIT)",
          "Reorder Point (ROP)"
        ],
        correctIndex: 1
      },
      {
        prompt: "A warehouse implements a computer-controlled system with cranes and shuttles that automatically place and retrieve pallets from high-density vertical racking. What is this technology called?",
        options: [
          "Automated Guided Vehicle (AGV)",
          "Internet of Things (IoT)",
          "Pick-to-Light System",
          "Automated Storage and Retrieval System (AS/RS)"
        ],
        correctIndex: 3
      },
      {
        prompt: "In inventory management, what is the main purpose of safety stock?",
        options: [
          "To meet regular, predictable demand between orders",
          "To act as a buffer against uncertainty in demand or lead time",
          "To take advantage of bulk purchase discounts",
          "To represent the inventory needed for a specific customer order"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is a \"Digital Twin\" in the context of warehousing?",
        options: [
          "A backup server for the Warehouse Management System (WMS)",
          "A physical, smaller-scale model of the warehouse used for training",
          "A virtual replica of the physical warehouse that updates in real time using data from sensors and systems",
          "A type of collaborative robot (co-bot) used for picking orders"
        ],
        correctIndex: 2
      },
      {
        prompt: "The Just-In-Time (JIT) inventory strategy is highly effective but is most vulnerable to which of the following risks?",
        options: [
          "High inventory holding costs",
          "Slow-moving or obsolete stock",
          "Supply chain disruptions and unreliable lead times",
          "The need for large warehouse spaces"
        ],
        correctIndex: 2
      },
      {
        prompt: "In an ABC analysis of inventory, how are \"Class A\" items typically characterized?",
        options: [
          "High volume of items, low impact on revenue",
          "Low volume of items, high impact on revenue",
          "Medium volume of items, medium impact on revenue",
          "High volume of items, high impact on revenue"
        ],
        correctIndex: 1
      }
    ],
    7: [
      {
        prompt: "What is the key difference in function between Generative AI and Traditional AI in a logistics context?",
        options: [
          "Traditional AI creates new route plans, while Generative AI only analyzes past data",
          "Generative AI creates new, human-like content and plans, while Traditional AI analyzes data to make predictions or classifications",
          "Traditional AI is more flexible and can be adapted to more tasks than Generative AI",
          "Generative AI requires structured and labeled data, while Traditional AI does not"
        ],
        correctIndex: 1
      },
      {
        prompt: "According to the presentation, which company uses an AI-powered route optimization system called ORION to save millions of miles driven annually?",
        options: [
          "Amazon",
          "DHL",
          "FedEx",
          "UPS"
        ],
        correctIndex: 3
      },
      {
        prompt: "Which of the following is listed as a major challenge in implementing AI in logistics?",
        options: [
          "The lack of available AI tools for the logistics sector",
          "The high cost of electricity required to run AI models",
          "The difficulty of integrating AI with existing legacy systems like TMS and WMS",
          "The inability of AI to perform complex tasks like demand forecasting"
        ],
        correctIndex: 2
      },
      {
        prompt: "The ethical principle that requires a clear understanding of how an AI model arrives at its decisions is known as:",
        options: [
          "Fairness",
          "Privacy",
          "Transparency (or \"explainable AI\")",
          "Security"
        ],
        correctIndex: 2
      },
      {
        prompt: "To ensure that an AI model does not make discriminatory decisions in areas like supplier selection or workforce scheduling, what mitigation strategy is recommended?",
        options: [
          "Using less data to train the model",
          "Keeping humans out of the decision loop entirely",
          "Conducting regular bias audits and using diverse training data",
          "Collecting only the minimum amount of data necessary"
        ],
        correctIndex: 2
      }
    ],
    8: [
      {
        prompt: "What is the primary goal of the Sales and Operations Planning (S&OP) process?",
        options: [
          "To only create a sales forecast for the next quarter",
          "To exclusively manage logistics and transportation capacity",
          "To balance supply and demand by aligning sales, operations, and finance",
          "To reduce inventory costs without considering customer service levels"
        ],
        correctIndex: 2
      },
      {
        prompt: "Distribution Requirements Planning (DRP) is a systematic approach used to determine:",
        options: [
          "The manufacturing cost of each product",
          "The marketing strategy for new product launches",
          "What products are needed, where they are needed, and when they are needed",
          "The final delivery address of every customer order"
        ],
        correctIndex: 2
      },
      {
        prompt: "In the context of logistics coordination, what is the primary focus of inbound logistics?",
        options: [
          "Delivering finished products to the end customer",
          "Managing the return of products from customers",
          "Sourcing and receiving raw materials and goods from suppliers",
          "Managing customer service and order fulfillment"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is a key feature of a Transportation Management System (TMS)?",
        options: [
          "Optimizing warehouse picking and packing processes",
          "Forecasting customer demand using historical data",
          "Planning routes, selecting carriers, and consolidating loads",
          "Managing inventory levels using the Economic Order Quantity (EOQ) model"
        ],
        correctIndex: 2
      },
      {
        prompt: "The collaboration between Walmart and Procter & Gamble, where real-time sales and inventory data were shared to improve replenishment, is a classic example of which strategy?",
        options: [
          "Just-In-Time (JIT)",
          "Collaborative Planning, Forecasting, and Replenishment (CPFR)",
          "Economic Order Quantity (EOQ)",
          "Lean Logistics"
        ],
        correctIndex: 1
      },
      {
        prompt: "The technique of classifying inventory into categories (e.g., A, B, C) based on value and frequency to focus management efforts on the most critical items is known as:",
        options: [
          "Just-In-Time (JIT)",
          "ABC Analysis",
          "Value Stream Mapping",
          "Economic Order Quantity (EOQ)"
        ],
        correctIndex: 1
      },
      {
        prompt: "To reduce the \"bullwhip effect\" and improve inventory accuracy across the supply chain, what is a key benefit of integrated planning?",
        options: [
          "It allows each partner to operate independently",
          "It focuses solely on reducing transportation costs",
          "It ensures all partners have access to the same, real-time data for decision-making",
          "It increases the need for safety stock at every level"
        ],
        correctIndex: 2
      }
    ],
    9: [
      {
        prompt: "Which classical route optimization algorithm is designed to find the shortest possible path that visits a set of locations exactly once and returns to the starting point?",
        options: [
          "Dijkstra's Algorithm",
          "Vehicle Routing Problem (VRP)",
          "Travelling Salesman Problem (TSP)",
          "Activity-Based Costing (ABC)"
        ],
        correctIndex: 2
      },
      {
        prompt: "What emerging technology uses wireless electromagnetic fields to automatically identify and track tags attached to objects, significantly improving inventory visibility and reducing manual scanning errors?",
        options: [
          "Internet of Things (IoT)",
          "Blockchain",
          "Radio Frequency Identification (RFID)",
          "Artificial Intelligence (AI)"
        ],
        correctIndex: 2
      },
      {
        prompt: "The Total Cost of Ownership (TCO) model in logistics helps businesses to:",
        options: [
          "Calculate only the initial freight charges for a shipment",
          "Find the shortest delivery route based on distance",
          "Trace operational costs to specific activities like loading and unloading",
          "Understand the true end-to-end cost of a product or service, including all direct and indirect costs over its lifecycle"
        ],
        correctIndex: 3
      },
      {
        prompt: "A company shifts a significant portion of its long-haul freight from road to rail to lower its carbon footprint. This is an example of which green transport strategy?",
        options: [
          "Modal Shift",
          "Route Optimization",
          "Reverse Logistics",
          "Fleet Modernization"
        ],
        correctIndex: 0
      },
      {
        prompt: "What is the primary function of a Transportation Management System (TMS)?",
        options: [
          "To automatically track the temperature and humidity of perishable goods",
          "To provide a secure, immutable ledger for trade documentation",
          "To help businesses plan, execute, and optimize the physical movement of goods",
          "To manage warehouse inventory levels and trigger reorders"
        ],
        correctIndex: 2
      }
    ]
  },
  "Certified-Human-Resource-Professional": {
    0: [
      {
        prompt: "What is the strategic role of Human Resource Management (HRM) in modern businesses?",
        options: [
          "Managing office supplies and payroll only",
          "Hiring employees quickly to reduce costs",
          "Aligning people-related decisions with organizational goals",
          "Ensuring all departments operate independently"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is an example of a key HRM function?",
        options: [
          "Increasing product shelf life",
          "Managing software licenses",
          "Recruitment and Selection",
          "Improving product design"
        ],
        correctIndex: 2
      },
      {
        prompt: "What major external factor has influenced the evolution of HRM practices?",
        options: [
          "National language policies",
          "Weather patterns",
          "Globalization",
          "Product recalls"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is an example of an HR compliance responsibility?",
        options: [
          "Conducting product safety inspections",
          "Aligning company policies with national labor laws",
          "Designing marketing campaigns",
          "Maintaining the office cafeteria"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the following is an emerging trend in Human Resource Management?",
        options: [
          "Replacing employees with AI fully",
          "Centralizing all HR decisions in one office",
          "Implementing hybrid work environments",
          "Eliminating onboarding programs"
        ],
        correctIndex: 2
      }
    ],
    1: [
      {
        prompt: "What is the main difference between talent acquisition and traditional recruitment?",
        options: [
          "Talent acquisition is faster and cheaper",
          "Traditional recruitment focuses on employee retention",
          "Talent acquisition is proactive and long-term",
          "Traditional recruitment uses more AI tools"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is a modern recruitment method mentioned in the content?",
        options: [
          "Door-to-door job advertising",
          "Faxed job applications",
          "Social media recruitment",
          "Bulletin board posting"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is the purpose of a competency framework in job analysis?",
        options: [
          "To replace interviews and resume screening",
          "To outline salary bands and job perks",
          "To define the skills and behaviors required for a role",
          "To list daily tasks of administrative staff"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which onboarding element focuses on making new employees feel aligned with company culture?",
        options: [
          "Role-specific training",
          "Orientation",
          "Pre-boarding",
          "Cultural integration"
        ],
        correctIndex: 3
      },
      {
        prompt: "Which of the following is a benefit of effective onboarding?",
        options: [
          "Reduces vacation requests",
          "Improves employee retention and engagement",
          "Increases administrative workload",
          "Limits internal promotions"
        ],
        correctIndex: 1
      }
    ],
    2: [
      {
        prompt: "What is the primary difference between training and development?",
        options: [
          "Training is mandatory; development is optional",
          "Training is short-term and job-specific; development is long-term and future-focused",
          "Training is only for managers; development is for new hires",
          "Training focuses on leadership skills; development focuses on technical skills"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the following is an example of a blended learning approach?",
        options: [
          "Assigning reading material only",
          "Live lectures without interaction",
          "Combining online modules with in-person workshops",
          "Using only mobile apps for training"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is the purpose of using AI and data analytics in employee training?",
        options: [
          "To replace human trainers",
          "To create one-size-fits-all courses",
          "To personalize learning experiences based on roles and performance",
          "To gamify all training content"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following best describes microlearning?",
        options: [
          "Intensive day-long workshops",
          "Long lectures followed by exams",
          "Short, focused learning sessions for quick retention",
          "Monthly seminars in a classroom setting"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is succession planning primarily focused on?",
        options: [
          "Reducing employee training costs",
          "Hiring from outside the organization",
          "Preparing internal talent to fill future leadership roles",
          "Cross-training employees in different departments"
        ],
        correctIndex: 2
      }
    ],
    3: [
      {
        prompt: "Which of the following best describes performance management?",
        options: [
          "A once-a-year evaluation of employee work",
          "A hiring process focused on recruiting top talent",
          "A continuous cycle of planning, monitoring, and improving employee performance",
          "A method to calculate salary increments"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is a key benefit of using 360-degree feedback in performance appraisal?",
        options: [
          "It reduces the time spent on annual reviews",
          "It gives feedback only from the employee's manager",
          "It provides a balanced view from multiple perspectives",
          "It focuses only on technical skills"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which tool is used in modern performance systems to align goals and track employee progress?",
        options: [
          "SWOT analysis",
          "OKR platforms and real-time dashboards",
          "Brainstorming sessions",
          "Focus groups"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the main purpose of a Performance Improvement Plan (PIP)?",
        options: [
          "To document employee achievements for promotions",
          "To encourage early retirement",
          "To give structured support to underperforming employees",
          "To eliminate the need for regular feedback"
        ],
        correctIndex: 2
      },
      {
        prompt: "What approach did Adobe take to replace traditional annual reviews?",
        options: [
          "Launched AI-driven assessments",
          "Outsourced performance evaluation",
          "Introduced frequent \"Check-Ins\" between employees and managers",
          "Removed all formal evaluation systems"
        ],
        correctIndex: 2
      }
    ],
    4: [
      {
        prompt: "Which of the following is included in direct compensation?",
        options: [
          "Paid vacation",
          "Retirement plans",
          "Base pay and performance bonuses",
          "Flexible work hours"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is the purpose of aligning total rewards with organizational strategy?",
        options: [
          "To reduce administrative costs",
          "To ensure all employees receive the same salary",
          "To motivate employees and support business goals",
          "To eliminate employee feedback systems"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is an example of indirect compensation?",
        options: [
          "Commission-based bonus",
          "Base salary",
          "Education assistance and wellness programs",
          "Stock options"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which legal requirement ensures fair pay for men and women performing similar work?",
        options: [
          "Tax regulations",
          "Employment Standards Act",
          "Pay Equity Act",
          "Retirement Savings Plan Act"
        ],
        correctIndex: 2
      },
      {
        prompt: "Why are flexible benefits programs becoming more popular in modern organizations?",
        options: [
          "They eliminate the need for health insurance",
          "They reduce the number of employees needed",
          "They increase employee engagement and cater to diverse needs",
          "They simplify payroll systems"
        ],
        correctIndex: 2
      }
    ],
    5: [
      {
        prompt: "Which of the following is covered under Employment Standards Legislation in Ontario?",
        options: [
          "Branding guidelines",
          "Minimum wages and vacation entitlements",
          "Immigration laws",
          "Foreign investment approvals"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the main purpose of Human Rights Legislation in the workplace?",
        options: [
          "To monitor business expenses",
          "To prevent workplace discrimination and harassment",
          "To promote external hiring only",
          "To manage international clients"
        ],
        correctIndex: 1
      },
      {
        prompt: "According to UAE Labour Law, how is gratuity (end-of-service benefit) calculated?",
        options: [
          "Based on total salary package",
          "Based on basic salary and number of children",
          "Based on basic salary and years of service",
          "Based on gross revenue of the employer"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following leave types is recognized under UAE labour law?",
        options: [
          "Vacation and meal leave",
          "Paid sick leave only for senior staff",
          "Maternity, paternity, and study leave",
          "Sabbatical leave for all employees"
        ],
        correctIndex: 2
      },
      {
        prompt: "What does the Emiratization policy in the UAE aim to achieve?",
        options: [
          "Reduce employee turnover",
          "Improve labor court efficiency",
          "Increase the number of UAE nationals in the private sector",
          "Allow labor unions in free zones"
        ],
        correctIndex: 2
      }
    ],
    6: [
      {
        prompt: "What is the primary role of organizational culture in a company?",
        options: [
          "To determine compensation levels",
          "To guide employee behavior and influence performance",
          "To reduce hiring time",
          "To replace legal compliance practices"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which type of organizational culture encourages innovation and risk-taking?",
        options: [
          "Hierarchy culture",
          "Clan culture",
          "Adhocracy culture",
          "Bureaucratic culture"
        ],
        correctIndex: 2
      },
      {
        prompt: "According to Lewin's Change Model, what is the purpose of the Unfreeze stage?",
        options: [
          "To finalize policy documentation",
          "To stabilize current operations",
          "To create awareness and readiness for change",
          "To reward employee performance"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which HR practice helps embed organizational values from the very beginning?",
        options: [
          "Payroll administration",
          "Recruitment and selection",
          "Legal compliance tracking",
          "Time-off scheduling"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is a key strategy for HR to support successful change adoption?",
        options: [
          "Avoiding feedback to reduce conflict",
          "Increasing administrative tasks during transitions",
          "Providing change management training to leaders",
          "Eliminating all team meetings during change"
        ],
        correctIndex: 2
      }
    ],
    7: [
      {
        prompt: "What is the main purpose of HR Analytics?",
        options: [
          "To automate payroll functions",
          "To monitor office attendance",
          "To collect and analyze HR data to improve decision-making and support strategy",
          "To eliminate the need for HR departments"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is a key metric used in recruitment analytics?",
        options: [
          "Engagement rate",
          "Time-to-fill",
          "Diversity score",
          "Training budget"
        ],
        correctIndex: 1
      },
      {
        prompt: "What does predictive analytics in HR help with?",
        options: [
          "Sending automatic email replies",
          "Tracking employee lateness",
          "Forecasting future outcomes like attrition risk or promotion readiness",
          "Creating training manuals"
        ],
        correctIndex: 2
      },
      {
        prompt: "How can data visualization benefit HR decision-making?",
        options: [
          "It eliminates the need for reports",
          "It hides performance issues",
          "It makes complex data easier to understand and act upon",
          "It replaces employee feedback"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is the use of employee sentiment analysis in HR analytics?",
        options: [
          "To increase salaries automatically",
          "To block negative emails",
          "To assess employee emotions and morale through surveys and feedback tools",
          "To count work hours for payroll"
        ],
        correctIndex: 2
      }
    ],
    8: [
      {
        prompt: "Why is ethics important in Human Resource Management?",
        options: [
          "To automate HR processes",
          "To boost company profits through shortcuts",
          "To promote fairness, transparency, and trust in the workplace",
          "To reduce employee salaries legally"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is a core principle of Corporate Social Responsibility (CSR)?",
        options: [
          "Aggressive marketing tactics",
          "Stock price manipulation",
          "Environmental sustainability",
          "Budget minimization"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is one way HR can support ethical and CSR initiatives?",
        options: [
          "Focus solely on profit margins",
          "Outsource all employee training",
          "Embed ethics into hiring and leadership development",
          "Remove codes of conduct"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is a tool used to measure the impact of ethical and CSR programs?",
        options: [
          "Sales growth charts",
          "Balanced scorecards with CSR KPIs",
          "Annual leave tracker",
          "Payroll system"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is a typical example of a CSR initiative?",
        options: [
          "Reducing employee breaks",
          "Offering volunteer programs for staff",
          "Cutting health benefits",
          "Replacing employees with automation"
        ],
        correctIndex: 1
      }
    ],
    9: [
      {
        prompt: "What is the primary goal of Diversity Management?",
        options: [
          "To reduce company costs",
          "To standardize employee behavior",
          "To create an inclusive and equitable workplace",
          "To promote cultural uniformity"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is an example of inclusive recruitment?",
        options: [
          "Conducting technical interviews only",
          "Hiring based solely on referrals",
          "Using blind resume screening to reduce bias",
          "Prioritizing internal promotions over new hires"
        ],
        correctIndex: 2
      },
      {
        prompt: "What does 'Equity' refer to in the context of DEI?",
        options: [
          "Equal number of employees from each demographic",
          "Treating everyone exactly the same",
          "Fair treatment, access, and opportunity for all",
          "Hiring based on quotas"
        ],
        correctIndex: 2
      },
      {
        prompt: "Why is cultural agility important in cross-border employment?",
        options: [
          "It reduces hiring costs",
          "It enforces global uniformity",
          "It helps build trust and avoid misunderstandings",
          "It replaces the need for local labor law knowledge"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which practice supports ongoing development of an inclusive workplace culture?",
        options: [
          "Annual performance reviews",
          "Diversity training and awareness workshops",
          "Standardizing employee dress codes",
          "Outsourcing all hiring decisions"
        ],
        correctIndex: 1
      }
    ],
    10: [
      {
        prompt: "What is a key benefit of using AI in HR recruitment and candidate screening?",
        options: [
          "Increasing employee turnover",
          "Conducting in-person interviews only",
          "Screening large volumes of resumes efficiently",
          "Eliminating the need for job descriptions"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which is an application of generative AI in onboarding?",
        options: [
          "Conducting exit interviews",
          "Writing payroll reports",
          "Generating welcome kits and onboarding checklists",
          "Approving annual leave requests"
        ],
        correctIndex: 2
      },
      {
        prompt: "How can AI support training and development in HR?",
        options: [
          "By scheduling employee shifts",
          "By creating personalized learning paths and microlearning content",
          "By writing employee contracts",
          "By terminating underperforming employees"
        ],
        correctIndex: 1
      },
      {
        prompt: "What ethical guideline must HR follow when using generative AI?",
        options: [
          "Use AI tools to make final hiring decisions",
          "Keep AI usage hidden from employees",
          "Ensure transparency and maintain accountability",
          "Share sensitive data with public AI platforms"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is a risk of relying solely on AI-generated content in HR?",
        options: [
          "Faster hiring processes",
          "Replicating biases present in training data",
          "Improved employee morale",
          "Better vacation tracking"
        ],
        correctIndex: 1
      }
    ]
  },
  "Certified-Sustainability-And-Leadership": (() => {
    // helper to build one‑question arrays for 12 modules
    const build = () => ({
      prompt: "Click any option to go to the next module",
      options: ["Click me", "Click me", "Click me", "Click me"],
      correctIndex: -1, // -1 means "all choices correct"
    });
    return {
      0: [build()],
      1: [build()],
      2: [build()],
      3: [build()],
      4: [build()],
      5: [build()],
      6: [build()],
      7: [build()],
      8: [build()],
      9: [build()]
    };
  })(),
  "Certified-Project-Manager": {
    0: [
      {
        prompt: "What is the primary purpose of a Project Charter?",
        options: [
          "To provide a detailed, task-by-task project schedule",
          "To formally authorize the existence of a project and grant authority to the project manager",
          "To act as a legal contract between the company and an external vendor",
          "To justify the financial return on investment for the project to executives"
        ],
        correctIndex: 1
      },
      {
        prompt: "Assessing if a project can be successfully implemented with current technology and technical expertise is known as what type of feasibility?",
        options: [
          "Financial Feasibility",
          "Operational Feasibility",
          "Technical Feasibility",
          "Schedule Feasibility"
        ],
        correctIndex: 2
      },
      {
        prompt: "According to the Power/Interest Grid, what is the best strategy for managing stakeholders who have high power but low interest?",
        options: [
          "Manage Closely",
          "Keep Informed",
          "Keep Satisfied",
          "Monitor with Minimum Effort"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which document is typically created before the Project Charter to justify the need for a project by analyzing its costs, benefits, and alignment with business goals?",
        options: [
          "Business Case",
          "Project Brief",
          "Stakeholder Register",
          "Work Breakdown Structure"
        ],
        correctIndex: 0
      },
      {
        prompt: "In the stakeholder engagement assessment matrix, if a key stakeholder's current engagement level is \"Resistant,\" what is a recommended first action?",
        options: [
          "Empower them with a leading role in the project",
          "Raise their awareness through general email newsletters",
          "Address their concerns directly, often through one-on-one communication",
          "Encourage them to become an advocate for the project"
        ],
        correctIndex: 2
      }
    ],
    1: [
      {
        prompt: "Which process in project scope management involves breaking down the total scope of work into smaller, more manageable components?",
        options: [
          "Define Scope",
          "Collect Requirements",
          "Create WBS (Work Breakdown Structure)",
          "Validate Scope"
        ],
        correctIndex: 2
      },
      {
        prompt: "The uncontrolled expansion or continuous growth in a project's scope, without corresponding adjustments to time, cost, and resources, is known as:",
        options: [
          "Scope Validation",
          "Scope Creep",
          "Scope Baseline",
          "Scope Statement"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the primary purpose of the \"Validate Scope\" process?",
        options: [
          "To monitor and manage changes to the scope baseline",
          "To create a detailed description of the project and product",
          "To formalize the acceptance of completed project deliverables",
          "To gather and document stakeholder needs and expectations"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager is creating a WBS for a new website. The top level is \"Develop a Website,\" and the next level is broken down into \"Market Research,\" \"Development,\" and \"Testing.\" This is an example of what type of WBS?",
        options: [
          "Process-Oriented WBS",
          "Deliverable-Based WBS",
          "Phase-Based WBS",
          "Resource-Based WBS"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the primary function of a Change Control Board (CCB)?",
        options: [
          "To conduct user acceptance testing for all project deliverables",
          "To review, evaluate, and make formal decisions on proposed changes to the project",
          "To assign daily tasks to the project team members",
          "To create the initial project scope statement"
        ],
        correctIndex: 1
      }
    ],
    2: [
      {
        prompt: "In the Critical Path Method (CPM), what does the \"critical path\" represent?",
        options: [
          "The sequence of tasks with the lowest risk",
          "The shortest possible path through the project network",
          "The path with the most available float or slack",
          "The longest sequence of dependent tasks, which determines the shortest project duration"
        ],
        correctIndex: 3
      },
      {
        prompt: "A project manager estimates that a task will take 20 days because a similar task on a previous project took 20 days. Which estimation technique is being used?",
        options: [
          "Parametric Estimating",
          "Analogous Estimating",
          "Three-Point Estimating",
          "Bottom-Up Estimating"
        ],
        correctIndex: 1
      },
      {
        prompt: "If a project activity, \"Test Software,\" cannot begin until the \"Write Code\" activity is complete, what type of dependency is this?",
        options: [
          "Start-to-Start (SS)",
          "Finish-to-Start (FS)",
          "Finish-to-Finish (FF)",
          "Start-to-Finish (SF)"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which schedule compression technique involves performing activities or phases in parallel that would normally be done in sequence?",
        options: [
          "Crashing",
          "Resource Leveling",
          "Fast Tracking",
          "Lead Time Application"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project has a Schedule Performance Index (SPI) of 1.2. What does this indicate?",
        options: [
          "The project is over budget",
          "The project is behind schedule",
          "The project is ahead of schedule",
          "The project is exactly on schedule"
        ],
        correctIndex: 2
      }
    ],
    3: [
      {
        prompt: "A project manager creating an early, high-level cost estimate for a new software project by comparing it to a similar project completed last year is using which technique?",
        options: [
          "Parametric Estimating",
          "Bottom-Up Estimating",
          "Analogous Estimating",
          "Three-Point Estimating"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which cost estimation technique is considered the most accurate because it involves summing the estimates of individual work packages?",
        options: [
          "Analogous Estimating",
          "Parametric Estimating",
          "Bottom-Up Estimating",
          "Top-Down Estimating"
        ],
        correctIndex: 2
      },
      {
        prompt: "In Earned Value Management (EVM), what does a Cost Performance Index (CPI) of less than 1 indicate?",
        options: [
          "The project is under budget",
          "The project is over budget",
          "The project is ahead of schedule",
          "The project is on budget"
        ],
        correctIndex: 1
      },
      {
        prompt: "The authorized, time-phased budget used to measure and monitor a project's cost performance is known as the:",
        options: [
          "Activity Cost Estimate",
          "Management Reserve",
          "Cost Baseline",
          "Basis of Estimates"
        ],
        correctIndex: 2
      },
      {
        prompt: "What does the \"Earned Value\" (EV) metric represent?",
        options: [
          "The actual cost incurred for the work performed",
          "The total budget for the entire project",
          "The value of the work that was scheduled to be completed by a specific date",
          "The value of the work that has actually been completed by a specific date"
        ],
        correctIndex: 3
      }
    ],
    4: [
      {
        prompt: "In the Six Sigma DMAIC methodology, which phase is primarily focused on identifying the root causes of a problem or defect?",
        options: [
          "Define",
          "Measure",
          "Analyze",
          "Improve"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which quality tool helps prioritize the \"vital few\" causes that are responsible for most of the problems, based on the 80/20 principle?",
        options: [
          "Control Chart",
          "Pareto Chart",
          "Scatter Diagram",
          "Check Sheet"
        ],
        correctIndex: 1
      },
      {
        prompt: "According to the Capability Maturity Model Integration (CMMI), a process that is unpredictable, poorly controlled, and reactive is at which maturity level?",
        options: [
          "Level 1 - Initial",
          "Level 2 - Managed",
          "Level 3 - Defined",
          "Level 4 - Quantitatively Managed"
        ],
        correctIndex: 0
      },
      {
        prompt: "The emphasis on preventing defects rather than detecting them through inspection is a core principle of:",
        options: [
          "Quality Control",
          "Quality Assurance",
          "Defect Repair Review",
          "Statistical Sampling"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the following is an international standard for Quality Management Systems (QMS) that helps organizations consistently meet customer and regulatory requirements?",
        options: [
          "CMMI",
          "Six Sigma",
          "IEEE 829",
          "ISO 9001"
        ],
        correctIndex: 3
      }
    ],
    5: [
      {
        prompt: "In a RACI matrix, what is the primary role of the person who is designated as \"Accountable\"?",
        options: [
          "The person who physically executes the work on the task.",
          "The person who has ultimate ownership and is answerable for the task's completion.",
          "The person who needs to provide their input or expertise on the task.",
          "The person who needs to be kept up-to-date on the task's progress."
        ],
        correctIndex: 1
      },
      {
        prompt: "According to Tuckman's model of team development, the \"Norming\" stage is when:",
        options: [
          "Team members first come together and are introduced.",
          "Team members experience conflict and friction as they discover challenges.",
          "The team moves beyond conflict and begins to function cohesively.",
          "The team breaks up after the project is complete."
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is considered a \"Motivating Factor\" according to Herzberg's Two-Factor Theory?",
        options: [
          "Salary",
          "Company policies",
          "Working conditions",
          "Achievement"
        ],
        correctIndex: 3
      },
      {
        prompt: "In the conflict resolution matrix, which style reflects a \"WIN:LOSE\" outcome and is characterized by high assertiveness and low cooperativeness?",
        options: [
          "Collaborating",
          "Accommodating",
          "Competing",
          "Avoiding"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager wants to visually display the amount of work allocated to each team member over the project's timeline to identify potential over-allocations. Which tool is best suited for this purpose?",
        options: [
          "RACI Matrix",
          "Resource Histogram",
          "Work Breakdown Structure",
          "Fishbone Diagram"
        ],
        correctIndex: 1
      },
      {
        prompt: "Daniel Pink's motivational theory, described as \"The Third Drive,\" is based on three intrinsic motivators: Autonomy, Mastery, and what other element?",
        options: [
          "Purpose",
          "Power",
          "Promotion",
          "Pay"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which metric is commonly used in Agile project management to track the remaining work against time and show the progress of a team within a sprint?",
        options: [
          "Task Completion Rate",
          "Planned vs. Actual Hours",
          "Burndown/Burnup Charts",
          "Team Velocity"
        ],
        correctIndex: 2
      }
    ],
    6: [
      {
        prompt: "A project manager identifies that a potential schedule delay of three weeks could occur due to supply chain issues. How would this risk be classified?",
        options: [
          "Qualitative Risk",
          "Quantitative Risk",
          "Stakeholder Risk",
          "Force Majeure Risk"
        ],
        correctIndex: 1
      },
      {
        prompt: "To deal with the threat of a key supplier failing to deliver on time, a project manager decides to hire a second, backup supplier. Which risk response strategy does this represent?",
        options: [
          "Transfer",
          "Avoid",
          "Accept",
          "Mitigate"
        ],
        correctIndex: 3
      },
      {
        prompt: "A project team learns that a new technology could potentially speed up their delivery time. To ensure this happens, they assign their most skilled team members to integrate it. Which strategy for a positive risk (opportunity) is being used?",
        options: [
          "Exploit",
          "Enhance",
          "Share",
          "Accept"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which quantitative risk analysis technique uses a model with probability distributions to simulate thousands of potential project outcomes and is useful for understanding the likelihood of meeting cost and schedule objectives?",
        options: [
          "Sensitivity Analysis",
          "Decision Tree Analysis",
          "Monte Carlo Simulation",
          "Expected Monetary Value (EMV) Analysis"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is a fallback plan designed to be used for?",
        options: [
          "To prevent a risk from occurring in the first place.",
          "As the primary response when a known risk event occurs.",
          "As an alternative action if the contingency plan fails or is ineffective.",
          "To document all identified risks in a project."
        ],
        correctIndex: 2
      },
      {
        prompt: "In qualitative risk analysis, what is the primary purpose of a Probability and Impact Matrix?",
        options: [
          "To calculate the exact financial cost of a risk.",
          "To determine the quality of the data used for risk analysis.",
          "To rank and prioritize risks by mapping their likelihood against their potential effect.",
          "To identify which risks have the most impact using a tornado diagram."
        ],
        correctIndex: 2
      },
      {
        prompt: "A risk has a 20% chance of occurring, and if it does, it will cost the project $50,000. What is the Expected Monetary Value (EMV) of this risk?",
        options: [
          "$10,000",
          "$50,000",
          "$250,000",
          "$40,000"
        ],
        correctIndex: 0
      }
    ],
    7: [
      {
        prompt: "Which contract type is most appropriate for a project where the scope is well-defined, requirements are clear, and changes are not expected?",
        options: [
          "Cost-Plus Fixed Fee (CPFF)",
          "Time & Material (T&M)",
          "Firm Fixed-Price (FFP)",
          "Cost-Plus Percentage of Cost (CPPC)"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager needs to gather pricing information for a standard, off-the-shelf piece of hardware where the specifications are perfectly clear. Which document should they issue?",
        options: [
          "Request for Information (RFI)",
          "Request for Proposal (RFP)",
          "Request for Quotation (RFQ)",
          "Make-or-Buy Decision"
        ],
        correctIndex: 2
      },
      {
        prompt: "In which contract type does the buyer (client) assume the most cost risk, as they agree to pay for all actual costs plus a fee?",
        options: [
          "Firm Fixed-Price (FFP)",
          "Cost-Reimbursable (Cost-Plus)",
          "Time & Material (T&M)",
          "Purchase Order (PO)"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is a key activity performed during the \"Closure & Evaluation\" phase of the contract and vendor management lifecycle?",
        options: [
          "Evaluating vendors via an RFP/RFQ process.",
          "Holding a kickoff meeting to align on deliverables.",
          "Conducting a final vendor performance review and documenting lessons learned.",
          "Monitoring vendor delivery against contractual milestones and timelines."
        ],
        correctIndex: 2
      },
      {
        prompt: "During the bid evaluation process, what is the primary purpose of assigning different weightings to the scoring criteria?",
        options: [
          "To ensure the vendor with the lowest price is always selected.",
          "To make the scoring process faster and less detailed.",
          "To reflect the relative importance of each criterion (e.g., technical fit, cost, experience) to the project's success.",
          "To allow vendors to choose which criteria they want to be scored on."
        ],
        correctIndex: 2
      },
      {
        prompt: "A Time & Material (T&M) contract, which is often used for short-term consultancy or when the scope is undefined, is considered a hybrid of which two major contract types?",
        options: [
          "Fixed-Price and Cost-Reimbursable",
          "Fixed-Price and Award Fee",
          "Cost-Reimbursable and Incentive Fee",
          "Purchase Order and Fixed-Price"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which document is signed by both the client and vendor to formally confirm that all deliverables have been received, reviewed, and accepted according to the contract terms?",
        options: [
          "Final Invoice",
          "Lessons Learned Report",
          "Vendor Performance Evaluation",
          "Final Acceptance Certificate"
        ],
        correctIndex: 3
      }
    ],
    8: [
      {
        prompt: "According to the four core values of the Agile Manifesto, which of the following is valued more highly than \"Processes and tools\"?",
        options: [
          "Comprehensive documentation",
          "Following a plan",
          "Contract negotiation",
          "Individuals and interactions"
        ],
        correctIndex: 3
      },
      {
        prompt: "In the Scrum framework, which role is responsible for owning the \"what\" and \"why\" of the product and for managing the Product Backlog?",
        options: [
          "Scrum Master",
          "Product Owner",
          "Development Team",
          "Project Manager"
        ],
        correctIndex: 1
      },
      {
        prompt: "The Kanban principle of limiting the number of tasks that can be in any one stage of the workflow at a given time is known as:",
        options: [
          "Visualizing the work",
          "Managing the flow",
          "Limiting the work in progress (WIP)",
          "Continuous Improvement"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which Agile metric is used to measure the amount of work a team completes in a sprint, helping to forecast future capacity?",
        options: [
          "Cycle Time",
          "Velocity",
          "Lead Time",
          "Defect Density"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which framework is specifically designed to help large organizations adopt and scale Agile principles and practices across multiple teams and levels?",
        options: [
          "Kanban",
          "Scrum",
          "Lean",
          "Scaled Agile Framework (SAFe)"
        ],
        correctIndex: 3
      },
      {
        prompt: "At the end of a sprint, the Scrum team holds a meeting to demonstrate the completed work to stakeholders and gather feedback. What is this ceremony called?",
        options: [
          "Sprint Retrospective",
          "Sprint Review",
          "Sprint Planning",
          "Daily Scrum"
        ],
        correctIndex: 1
      },
      {
        prompt: "A project that uses a traditional Waterfall model for its initial planning and requirements phase but then uses Agile sprints for development and execution is known as:",
        options: [
          "Agile Stage-Gate Model",
          "Scrum@Scale Model",
          "Agile-Waterfall Hybrid",
          "Scrumban Model"
        ],
        correctIndex: 2
      }
    ],
    9: [
      {
        prompt: "According to the PMI Code of Ethics, which core value involves taking ownership of your decisions and their consequences, and reporting unethical conduct?",
        options: [
          "Respect",
          "Fairness",
          "Honesty",
          "Responsibility"
        ],
        correctIndex: 3
      },
      {
        prompt: "A project manager who prioritizes the team's needs, focuses on their growth, removes obstacles, and shares power to drive engagement is demonstrating which leadership style?",
        options: [
          "Directive Leadership",
          "Pacesetting Leadership",
          "Servant Leadership",
          "Visionary Leadership"
        ],
        correctIndex: 2
      },
      {
        prompt: "In Daniel Goleman's Emotional Intelligence framework, the ability to control disruptive impulses and think before acting is known as:",
        options: [
          "Self-Awareness",
          "Self-Management (Self-Regulation)",
          "Social Awareness",
          "Relationship Management"
        ],
        correctIndex: 1
      },
      {
        prompt: "A project manager who excels at staying calm, managing stress, and showing empathy to the team during a high-pressure crisis is demonstrating which key crisis leadership competency?",
        options: [
          "Decisiveness Under Uncertainty",
          "Strategic Thinking",
          "Emotional Intelligence",
          "Collaborative Influence"
        ],
        correctIndex: 2
      },
      {
        prompt: "In the Diversity & Inclusion Matrix, which persona represents someone who is well-intentioned and supports D&I but is uninformed and may unknowingly contribute to problems?",
        options: [
          "The Champion",
          "The Bystander",
          "The Bigot",
          "The Newbie"
        ],
        correctIndex: 3
      },
      {
        prompt: "Which leadership style is most effective for achieving short-term goals with a highly skilled team, but can lead to stressed and unmotivated employees if used improperly?",
        options: [
          "Affiliative Leadership",
          "Coaching Leadership",
          "Pacesetting Leadership",
          "Participative Leadership"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which tool is particularly effective for promoting ethical accountability by clarifying who is responsible, accountable, consulted, and informed for specific tasks?",
        options: [
          "Issue Log",
          "RACI Matrix",
          "Decision Log",
          "Ethical Checklist"
        ],
        correctIndex: 1
      }
    ]
  },
  "Certified-Project-Management-Professional": {
    0: [
      {
        prompt: "A company launches a \"Digital Transformation\" initiative that includes separate but related projects for cloud migration, CRM implementation, and employee training. This entire initiative is best described as a:",
        options: [
          "Project",
          "Program",
          "Portfolio",
          "Work Package"
        ],
        correctIndex: 1
      },
      {
        prompt: "In which of the five process groups is the project charter formally developed and authorized?",
        options: [
          "Planning",
          "Executing",
          "Initiating",
          "Closing"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which project lifecycle model is best suited for projects with stable, well-defined requirements, such as in construction or manufacturing, where each phase is completed sequentially?",
        options: [
          "Agile/Adaptive Life Cycle",
          "Iterative Life Cycle",
          "Predictive Life Cycle (Waterfall Model)",
          "Hybrid Life Cycle"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is a Work Breakdown Structure (WBS) used for in project management?",
        options: [
          "To show the project schedule and task durations on a bar chart",
          "To create a hierarchical decomposition of the total scope of work",
          "To identify the longest sequence of dependent tasks",
          "To formally authorize the existence of a project"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the ten knowledge areas is responsible for unifying and coordinating all the various project elements to ensure they work together effectively?",
        options: [
          "Project Scope Management",
          "Project Stakeholder Management",
          "Project Integration Management",
          "Project Communication Management"
        ],
        correctIndex: 2
      },
      {
        prompt: "The \"Triple Constraint\" of project management requires balancing which three critical factors?",
        options: [
          "Risk, Quality, and Resources",
          "Scope, Time, and Cost",
          "Stakeholders, Communication, and Procurement",
          "Planning, Execution, and Monitoring"
        ],
        correctIndex: 1
      },
      {
        prompt: "The systematic execution of projects, programs, and portfolios in direct alignment with an organization's long-term goals is known as:",
        options: [
          "Project Closing",
          "Strategic Delivery",
          "Risk Management",
          "Scope Control"
        ],
        correctIndex: 1
      }
    ],
    1: [
      {
        prompt: "What is the primary purpose of a Project Charter?",
        options: [
          "To provide a detailed, task-by-task project schedule",
          "To formally authorize the existence of a project and grant authority to the project manager",
          "To act as a legal contract between the company and an external vendor",
          "To justify the financial return on investment for the project to executives"
        ],
        correctIndex: 1
      },
      {
        prompt: "Assessing if a project can be successfully implemented with current technology and technical expertise is known as what type of feasibility?",
        options: [
          "Financial Feasibility",
          "Operational Feasibility",
          "Technical Feasibility",
          "Schedule Feasibility"
        ],
        correctIndex: 2
      },
      {
        prompt: "According to the Power/Interest Grid, what is the best strategy for managing stakeholders who have high power but low interest?",
        options: [
          "Manage Closely",
          "Keep Informed",
          "Keep Satisfied",
          "Monitor with Minimum Effort"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which document is typically created before the Project Charter to justify the need for a project by analyzing its costs, benefits, and alignment with business goals?",
        options: [
          "Business Case",
          "Project Brief",
          "Stakeholder Register",
          "Work Breakdown Structure"
        ],
        correctIndex: 0
      },
      {
        prompt: "In the stakeholder engagement assessment matrix, if a key stakeholder's current engagement level is \"Resistant,\" what is a recommended first action?",
        options: [
          "Empower them with a leading role in the project",
          "Raise their awareness through general email newsletters",
          "Address their concerns directly, often through one-on-one communication",
          "Encourage them to become an advocate for the project"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager sends out a weekly email newsletter with project updates to a large group of stakeholders. What type of communication is this?",
        options: [
          "Interactive Communication",
          "Pull Communication",
          "Push Communication",
          "Informal Communication"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which initiation document is the most detailed and comprehensive, defining the project's objectives, scope, governance, and approach for the project team and key stakeholders?",
        options: [
          "Project Brief",
          "Project Charter",
          "Project Initiation Document (PID)",
          "Business Case"
        ],
        correctIndex: 2
      }
    ],
    2: [
      {
        prompt: "Which process in project scope management involves breaking down the total scope of work into smaller, more manageable components?",
        options: [
          "Define Scope",
          "Collect Requirements",
          "Create WBS (Work Breakdown Structure)",
          "Validate Scope"
        ],
        correctIndex: 2
      },
      {
        prompt: "The uncontrolled expansion or continuous growth in a project's scope, without corresponding adjustments to time, cost, and resources, is known as:",
        options: [
          "Scope Validation",
          "Scope Creep",
          "Scope Baseline",
          "Scope Statement"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the primary purpose of the \"Validate Scope\" process?",
        options: [
          "To monitor and manage changes to the scope baseline",
          "To create a detailed description of the project and product",
          "To formalize the acceptance of completed project deliverables",
          "To gather and document stakeholder needs and expectations"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager is creating a WBS for a new website. The top level is \"Develop a Website,\" and the next level is broken down into \"Market Research,\" \"Development,\" and \"Testing.\" This is an example of what type of WBS?",
        options: [
          "Process-Oriented WBS",
          "Deliverable-Based WBS",
          "Phase-Based WBS",
          "Resource-Based WBS"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is the primary function of a Change Control Board (CCB)?",
        options: [
          "To conduct user acceptance testing for all project deliverables",
          "To review, evaluate, and make formal decisions on proposed changes to the project",
          "To assign daily tasks to the project team members",
          "To create the initial project scope statement"
        ],
        correctIndex: 1
      },
      {
        prompt: "Watching users perform their tasks to identify pain points and process gaps is an example of which requirements collection technique?",
        options: [
          "Interviews",
          "Surveys",
          "Observation",
          "Prototyping"
        ],
        correctIndex: 2
      },
      {
        prompt: "In a Work Breakdown Structure, what is the lowest level of the hierarchy that can be scheduled, costed, and assigned to a team member or group?",
        options: [
          "Major Deliverable",
          "Project Title",
          "Sub-deliverable",
          "Work Package"
        ],
        correctIndex: 3
      }
    ],
    3: [
      {
        prompt: "In the Critical Path Method (CPM), what does the \"critical path\" represent?",
        options: [
          "The sequence of tasks with the lowest risk",
          "The shortest possible path through the project network",
          "The path with the most available float or slack",
          "The longest sequence of dependent tasks, which determines the shortest project duration"
        ],
        correctIndex: 3
      },
      {
        prompt: "A project manager estimates that a task will take 20 days because a similar task on a previous project took 20 days. Which estimation technique is being used?",
        options: [
          "Parametric Estimating",
          "Analogous Estimating",
          "Three-Point Estimating",
          "Bottom-Up Estimating"
        ],
        correctIndex: 1
      },
      {
        prompt: "If a project activity, \"Test Software,\" cannot begin until the \"Write Code\" activity is complete, what type of dependency is this?",
        options: [
          "Start-to-Start (SS)",
          "Finish-to-Start (FS)",
          "Finish-to-Finish (FF)",
          "Start-to-Finish (SF)"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which schedule compression technique involves performing activities or phases in parallel that would normally be done in sequence?",
        options: [
          "Crashing",
          "Resource Leveling",
          "Fast Tracking",
          "Lead Time Application"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project has a Schedule Performance Index (SPI) of 1.2. What does this indicate?",
        options: [
          "The project is over budget",
          "The project is behind schedule",
          "The project is ahead of schedule",
          "The project is exactly on schedule"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager adjusts the schedule to allow the \"Write User Manual\" activity to begin 5 days before the \"Finalize Software\" activity is complete. This 5-day overlap is an example of a:",
        options: [
          "Lag",
          "Float",
          "Lead",
          "Buffer"
        ],
        correctIndex: 2
      },
      {
        prompt: "On a Milestone Trend Analysis (MTA) chart, what does a consistently upward-sloping line for a milestone indicate?",
        options: [
          "The milestone is stable and on track",
          "The milestone is being completed earlier than planned",
          "The milestone is being repeatedly delayed over time",
          "The schedule is unstable due to poor planning"
        ],
        correctIndex: 2
      }
    ],
    4: [
      {
        prompt: "A project manager creating an early, high-level cost estimate for a new software project by comparing it to a similar project completed last year is using which technique?",
        options: [
          "Parametric Estimating",
          "Bottom-Up Estimating",
          "Analogous Estimating",
          "Three-Point Estimating"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which cost estimation technique is considered the most accurate because it involves summing the estimates of individual work packages?",
        options: [
          "Analogous Estimating",
          "Parametric Estimating",
          "Bottom-Up Estimating",
          "Top-Down Estimating"
        ],
        correctIndex: 2
      },
      {
        prompt: "In Earned Value Management (EVM), what does a Cost Performance Index (CPI) of less than 1 indicate?",
        options: [
          "The project is under budget",
          "The project is over budget",
          "The project is ahead of schedule",
          "The project is on budget"
        ],
        correctIndex: 1
      },
      {
        prompt: "The authorized, time-phased budget used to measure and monitor a project's cost performance is known as the:",
        options: [
          "Activity Cost Estimate",
          "Management Reserve",
          "Cost Baseline",
          "Basis of Estimates"
        ],
        correctIndex: 2
      },
      {
        prompt: "What does the \"Earned Value\" (EV) metric represent?",
        options: [
          "The actual cost incurred for the work performed",
          "The total budget for the entire project",
          "The value of the work that was scheduled to be completed by a specific date",
          "The value of the work that has actually been completed by a specific date"
        ],
        correctIndex: 3
      },
      {
        prompt: "If a project's current cost performance is expected to continue, the most common formula to forecast the final project cost is the Estimate at Completion (EAC), calculated as:",
        options: [
          "EAC = AC + ETC",
          "EAC = BAC / CPI",
          "EAC = EV - PV",
          "EAC = BAC - AC"
        ],
        correctIndex: 1
      },
      {
        prompt: "A key lesson from the NASA Mars Climate Orbiter case study is that project cost losses can result from:",
        options: [
          "Centralized cost governance and transparency",
          "The use of performance-linked payments with contractors",
          "Poor coordination and communication between teams (e.g., using different units of measure)",
          "Adopting lean budgeting and value-driven estimates"
        ],
        correctIndex: 2
      }
    ],
    5: [
      {
        prompt: "In the Six Sigma DMAIC methodology, which phase is primarily focused on identifying the root causes of a problem or defect?",
        options: [
          "Define",
          "Measure",
          "Analyze",
          "Improve"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which quality tool helps prioritize the \"vital few\" causes that are responsible for most of the problems, based on the 80/20 principle?",
        options: [
          "Control Chart",
          "Pareto Chart",
          "Scatter Diagram",
          "Check Sheet"
        ],
        correctIndex: 1
      },
      {
        prompt: "According to the Capability Maturity Model Integration (CMMI), a process that is unpredictable, poorly controlled, and reactive is at which maturity level?",
        options: [
          "Level 1 - Initial",
          "Level 2 - Managed",
          "Level 3 - Defined",
          "Level 4 - Quantitatively Managed"
        ],
        correctIndex: 0
      },
      {
        prompt: "The emphasis on preventing defects rather than detecting them through inspection is a core principle of:",
        options: [
          "Quality Control",
          "Quality Assurance",
          "Defect Repair Review",
          "Statistical Sampling"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the following is an international standard for Quality Management Systems (QMS) that helps organizations consistently meet customer and regulatory requirements?",
        options: [
          "CMMI",
          "Six Sigma",
          "IEEE 829",
          "ISO 9001"
        ],
        correctIndex: 3
      }
    ],
    6: [
      {
        prompt: "In a RACI matrix, what is the primary role of the person who is designated as \"Accountable\"?",
        options: [
          "The person who physically executes the work on the task.",
          "The person who has ultimate ownership and is answerable for the task's completion.",
          "The person who needs to provide their input or expertise on the task.",
          "The person who needs to be kept up-to-date on the task's progress."
        ],
        correctIndex: 1
      },
      {
        prompt: "According to Tuckman's model of team development, the \"Norming\" stage is when:",
        options: [
          "Team members first come together and are introduced.",
          "Team members experience conflict and friction as they discover challenges.",
          "The team moves beyond conflict and begins to function cohesively.",
          "The team breaks up after the project is complete."
        ],
        correctIndex: 2
      },
      {
        prompt: "Which of the following is considered a \"Motivating Factor\" according to Herzberg's Two-Factor Theory?",
        options: [
          "Salary",
          "Company policies",
          "Working conditions",
          "Achievement"
        ],
        correctIndex: 3
      },
      {
        prompt: "In the conflict resolution matrix, which style reflects a \"WIN:LOSE\" outcome and is characterized by high assertiveness and low cooperativeness?",
        options: [
          "Collaborating",
          "Accommodating",
          "Competing",
          "Avoiding"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager wants to visually display the amount of work allocated to each team member over the project's timeline to identify potential over-allocations. Which tool is best suited for this purpose?",
        options: [
          "RACI Matrix",
          "Resource Histogram",
          "Work Breakdown Structure",
          "Fishbone Diagram"
        ],
        correctIndex: 1
      },
      {
        prompt: "Daniel Pink's motivational theory, described as \"The Third Drive,\" is based on three intrinsic motivators: Autonomy, Mastery, and what other element?",
        options: [
          "Purpose",
          "Power",
          "Promotion",
          "Pay"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which metric is commonly used in Agile project management to track the remaining work against time and show the progress of a team within a sprint?",
        options: [
          "Task Completion Rate",
          "Planned vs. Actual Hours",
          "Burndown/Burnup Charts",
          "Team Velocity"
        ],
        correctIndex: 2
      }
    ],
    7: [
      {
        prompt: "A project manager identifies that a potential schedule delay of three weeks could occur due to supply chain issues. How would this risk be classified?",
        options: [
          "Qualitative Risk",
          "Quantitative Risk",
          "Stakeholder Risk",
          "Force Majeure Risk"
        ],
        correctIndex: 1
      },
      {
        prompt: "To deal with the threat of a key supplier failing to deliver on time, a project manager decides to hire a second, backup supplier. Which risk response strategy does this represent?",
        options: [
          "Transfer",
          "Avoid",
          "Accept",
          "Mitigate"
        ],
        correctIndex: 3
      },
      {
        prompt: "A project team learns that a new technology could potentially speed up their delivery time. To ensure this happens, they assign their most skilled team members to integrate it. Which strategy for a positive risk (opportunity) is being used?",
        options: [
          "Exploit",
          "Enhance",
          "Share",
          "Accept"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which quantitative risk analysis technique uses a model with probability distributions to simulate thousands of potential project outcomes and is useful for understanding the likelihood of meeting cost and schedule objectives?",
        options: [
          "Sensitivity Analysis",
          "Decision Tree Analysis",
          "Monte Carlo Simulation",
          "Expected Monetary Value (EMV) Analysis"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is a fallback plan designed to be used for?",
        options: [
          "To prevent a risk from occurring in the first place.",
          "As the primary response when a known risk event occurs.",
          "As an alternative action if the contingency plan fails or is ineffective.",
          "To document all identified risks in a project."
        ],
        correctIndex: 2
      },
      {
        prompt: "In qualitative risk analysis, what is the primary purpose of a Probability and Impact Matrix?",
        options: [
          "To calculate the exact financial cost of a risk.",
          "To determine the quality of the data used for risk analysis.",
          "To rank and prioritize risks by mapping their likelihood against their potential effect.",
          "To identify which risks have the most impact using a tornado diagram."
        ],
        correctIndex: 2
      },
      {
        prompt: "A risk has a 20% chance of occurring, and if it does, it will cost the project $50,000. What is the Expected Monetary Value (EMV) of this risk?",
        options: [
          "$10,000",
          "$50,000",
          "$250,000",
          "$40,000"
        ],
        correctIndex: 0
      }
    ],
    8: [
      {
        prompt: "Which contract type is most appropriate for a project where the scope is well-defined, requirements are clear, and changes are not expected?",
        options: [
          "Cost-Plus Fixed Fee (CPFF)",
          "Time & Material (T&M)",
          "Firm Fixed-Price (FFP)",
          "Cost-Plus Percentage of Cost (CPPC)"
        ],
        correctIndex: 2
      },
      {
        prompt: "A project manager needs to gather pricing information for a standard, off-the-shelf piece of hardware where the specifications are perfectly clear. Which document should they issue?",
        options: [
          "Request for Information (RFI)",
          "Request for Proposal (RFP)",
          "Request for Quotation (RFQ)",
          "Make-or-Buy Decision"
        ],
        correctIndex: 2
      },
      {
        prompt: "In which contract type does the buyer (client) assume the most cost risk, as they agree to pay for all actual costs plus a fee?",
        options: [
          "Firm Fixed-Price (FFP)",
          "Cost-Reimbursable (Cost-Plus)",
          "Time & Material (T&M)",
          "Purchase Order (PO)"
        ],
        correctIndex: 1
      },
      {
        prompt: "What is a key activity performed during the \"Closure & Evaluation\" phase of the contract and vendor management lifecycle?",
        options: [
          "Evaluating vendors via an RFP/RFQ process.",
          "Holding a kickoff meeting to align on deliverables.",
          "Conducting a final vendor performance review and documenting lessons learned.",
          "Monitoring vendor delivery against contractual milestones and timelines."
        ],
        correctIndex: 2
      },
      {
        prompt: "During the bid evaluation process, what is the primary purpose of assigning different weightings to the scoring criteria?",
        options: [
          "To ensure the vendor with the lowest price is always selected.",
          "To make the scoring process faster and less detailed.",
          "To reflect the relative importance of each criterion (e.g., technical fit, cost, experience) to the project's success.",
          "To allow vendors to choose which criteria they want to be scored on."
        ],
        correctIndex: 2
      },
      {
        prompt: "A Time & Material (T&M) contract, which is often used for short-term consultancy or when the scope is undefined, is considered a hybrid of which two major contract types?",
        options: [
          "Fixed-Price and Cost-Reimbursable",
          "Fixed-Price and Award Fee",
          "Cost-Reimbursable and Incentive Fee",
          "Purchase Order and Fixed-Price"
        ],
        correctIndex: 0
      },
      {
        prompt: "Which document is signed by both the client and vendor to formally confirm that all deliverables have been received, reviewed, and accepted according to the contract terms?",
        options: [
          "Final Invoice",
          "Lessons Learned Report",
          "Vendor Performance Evaluation",
          "Final Acceptance Certificate"
        ],
        correctIndex: 3
      }
    ],
    9: [
      {
        prompt: "According to the four core values of the Agile Manifesto, which of the following is valued more highly than \"Processes and tools\"?",
        options: [
          "Comprehensive documentation",
          "Following a plan",
          "Contract negotiation",
          "Individuals and interactions"
        ],
        correctIndex: 3
      },
      {
        prompt: "In the Scrum framework, which role is responsible for owning the \"what\" and \"why\" of the product and for managing the Product Backlog?",
        options: [
          "Scrum Master",
          "Product Owner",
          "Development Team",
          "Project Manager"
        ],
        correctIndex: 1
      },
      {
        prompt: "The Kanban principle of limiting the number of tasks that can be in any one stage of the workflow at a given time is known as:",
        options: [
          "Visualizing the work",
          "Managing the flow",
          "Limiting the work in progress (WIP)",
          "Continuous Improvement"
        ],
        correctIndex: 2
      },
      {
        prompt: "Which Agile metric is used to measure the amount of work a team completes in a sprint, helping to forecast future capacity?",
        options: [
          "Cycle Time",
          "Velocity",
          "Lead Time",
          "Defect Density"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which framework is specifically designed to help large organizations adopt and scale Agile principles and practices across multiple teams and levels?",
        options: [
          "Kanban",
          "Scrum",
          "Lean",
          "Scaled Agile Framework (SAFe)"
        ],
        correctIndex: 3
      },
      {
        prompt: "At the end of a sprint, the Scrum team holds a meeting to demonstrate the completed work to stakeholders and gather feedback. What is this ceremony called?",
        options: [
          "Sprint Retrospective",
          "Sprint Review",
          "Sprint Planning",
          "Daily Scrum"
        ],
        correctIndex: 1
      },
      {
        prompt: "A project that uses a traditional Waterfall model for its initial planning and requirements phase but then uses Agile sprints for development and execution is known as:",
        options: [
          "Agile Stage-Gate Model",
          "Scrum@Scale Model",
          "Agile-Waterfall Hybrid",
          "Scrumban Model"
        ],
        correctIndex: 2
      }
    ],
    10: [
      {
        prompt: "What is natural language processing (NLP) and how can it benefit project managers?",
        options: [
          "A programming language used to create project management software",
          "A technology that helps computers understand and process human language",
          "A method for scheduling project tasks and dependencies",
          "A framework for managing cross-cultural communication in global projects"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which machine learning technique is most commonly used for predictive analytics in project management?",
        options: [
          "Unsupervised learning algorithms",
          "Reinforcement learning models",
          "Supervised learning algorithms",
          "Deep learning neural networks"
        ],
        correctIndex: 2
      },
      {
        prompt: "What is algorithmic bias and why should project managers be concerned about it?",
        options: [
          "A technical error that occurs when algorithms process too much data",
          "The tendency for AI systems to perpetuate unfair or discriminatory outcomes based on biased training data",
          "A programming mistake that causes software applications to crash",
          "The preference of algorithms to favor certain file formats over others"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which of the following is a key principle of effective data governance in project management?",
        options: [
          "Collecting as much data as possible regardless of relevance",
          "Storing all project data in a single, centralized database",
          "Ensuring data quality, security, and compliance throughout the project lifecycle",
          "Using only proprietary data formats to maintain competitive advantage"
        ],
        correctIndex: 2
      },
      {
        prompt: "How can AI-powered tools assist project managers in risk assessment?",
        options: [
          "By eliminating all project risks through automated prevention",
          "By replacing human judgment entirely in risk evaluation",
          "By analyzing historical data patterns to identify potential risks and their likelihood",
          "By guaranteeing project success through predictive modeling"
        ],
        correctIndex: 2
      },
      {
        prompt: "What ethical consideration should project managers keep in mind when implementing AI solutions?",
        options: [
          "AI tools should always be used without human oversight to maximize efficiency",
          "Transparency and accountability in AI decision-making processes",
          "Cost reduction should be the primary factor in AI implementation",
          "AI systems should be kept secret from stakeholders to maintain competitive advantage"
        ],
        correctIndex: 1
      },
      {
        prompt: "Which AI application is most beneficial for resource allocation in project management?",
        options: [
          "Chatbots for customer service interactions",
          "Image recognition for document scanning",
          "Optimization algorithms for efficient resource distribution",
          "Voice assistants for meeting scheduling"
        ],
        correctIndex: 2
      }
    ]
  }
};

// Generate upcoming live classes for a course
function generateLiveClasses(courseSlug: string, count: number = 3) {
  const courseData = coursesData[courseSlug as keyof typeof coursesData];
  if (!courseData) return [];
  
  const classes = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const dayOffset = 3 + (i * 7); // Starting 3 days from now, then weekly
    const startTime = new Date(today);
    startTime.setDate(today.getDate() + dayOffset);
    startTime.setHours(18, 0, 0, 0); // 6 PM
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + courseData.liveClassConfig.durationMin);
    
    const moduleIndex = i % courseData.modules.length;
    
    classes.push({
      title: `${courseData.title}: ${courseData.modules[moduleIndex].title} Session`,
      courseSlug: courseSlug,
      description: `Live session covering key concepts from ${courseData.modules[moduleIndex].title}`,
      meetLink: `https://meet.google.com/${courseSlug}-session-${i + 1}`,
      startTime: startTime,
      endTime: endTime,
      status: 'scheduled',
    });
  }
  
  return classes;
}

// Main seed function
async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // ------------------------------------------------------------------
    // Wipe or keep data depending on CLI arg
    // ------------------------------------------------------------------
    if (!courseToSeed) {
      console.log('Clearing existing data...');
      await User.deleteMany({});
      await Student.deleteMany({});
      await Course.deleteMany({});
      await Enrollment.deleteMany({});
      await LiveClass.deleteMany({});
      await Quiz.deleteMany({});
      console.log('All collections cleared');
    } else {
      console.log(
        `Selective seeding – keeping existing data; will upsert course "${courseToSeed}"`
      );
      // Delete existing quizzes for this specific course
      console.log(`Deleting existing quizzes for course: ${courseToSeed}`);
      await Quiz.deleteMany({ courseSlug: courseToSeed });
      console.log(`Existing quizzes deleted for ${courseToSeed}`);
    }
    
    if (!courseToSeed) {
      // Create admin user
      console.log('Creating admin user...');
      const admin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password', // will be hashed by the model pre-save hook
        role: 'admin',
      });
      await admin.save();
      console.log('Admin created:', admin._id);
      
      // Create Peter Parker student user
      console.log('Creating Peter Parker student user...');
      const peterUser = new User({
        username: 'peterparker',
        email: 'peter@example.com',
        password: 'password', // will be hashed by the model pre-save hook
        role: 'student',
      });
      await peterUser.save();
      console.log('Peter Parker user created:', peterUser._id);
      
      // Create Peter Parker student profile
      console.log('Creating Peter Parker student profile...');
      const peter = new Student({
        name: 'Peter Parker',
        userId: peterUser._id,
        pathway: 'standalone',
        address: '20 Ingram St, Forest Hills, NY',
        phone: '+17185551212',
        dob: new Date(2000, 5, 12), // June 12, 2000
      });
      await peter.save();
      console.log('Student profile created:', peter._id);
      
      // Create Bruce Wayne student user
      console.log('Creating Bruce Wayne student user...');
      const bruceUser = new User({
        username: 'brucewayne',
        email: 'bruce@example.com',
        password: 'password',
        role: 'student',
      });
      await bruceUser.save();
      console.log('Bruce Wayne user created:', bruceUser._id);

      console.log('Creating Bruce Wayne student profile...');
      const bruce = new Student({
        name: 'Bruce Wayne',
        userId: bruceUser._id,
        pathway: 'standalone',
        address: '1007 Mountain Drive, Gotham',
        phone: '+17035551234',
        dob: new Date(1990, 1, 19), // Feb 19, 1990
      });
      await bruce.save();
      console.log('Student profile created:', bruce._id);

      // Create enrollments for Peter in CSCP and Bruce in CIA (zero progress)
      console.log('Creating enrollments...');
      const enrollmentData = [
        {
          studentId: peter._id,
          courseSlug: 'Accounting-and-Finance',
          enrollDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          validUntil: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000),
          completedModules: [],
          quizAttempts: [],
          watchTime: []
        },
        {
          studentId: bruce._id,
          courseSlug: 'certified-supply-chain-professional',
          enrollDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000),
          completedModules: [],
          quizAttempts: [],
          watchTime: []
        }
      ];

      for (const data of enrollmentData) {
        const enrollment = new Enrollment(data);
        await enrollment.save();
        let studentName = data.studentId.equals(peter._id) ? peter.name : bruce.name;
        console.log(`Enrollment created for ${studentName} in ${data.courseSlug} (${enrollment._id})`);
      }
    } // end if !courseToSeed

    // Create or update courses (all, or only the specified one)
    console.log('Upserting courses...');
    for (const courseData of Object.values(coursesData)) {
      if (courseToSeed && courseData.slug !== courseToSeed) continue;

      const existing = await Course.findOne({ slug: courseData.slug });
      if (existing) {
        await Course.updateOne({ slug: courseData.slug }, courseData);
        console.log(`Course updated: ${courseData.title}`);
      } else {
        const course = new Course(courseData);
        await course.save();
        console.log(`Course created: ${course.title}`);
      }
    }

    // Seed quizzes for each course module
    console.log('Seeding quizzes for each course module...');
    for (const [courseSlug, courseObj] of Object.entries(coursesData)) {
      if (courseToSeed && courseSlug !== courseToSeed) continue;
      for (let moduleIndex = 0; moduleIndex < courseObj.modules.length; moduleIndex++) {
        // Use quizQuestionsMapping if available
        const mapping = quizQuestionsMapping[courseSlug]?.[moduleIndex];
        let questions;
        if (Array.isArray(mapping) && mapping.length > 0) {
          questions = mapping.map(({ prompt, options, correctIndex }) => ({
            text: prompt,
            choices: options,
            correctIndex
          }));
        } else {
          // Fallback to placeholder questions
          questions = Array(5).fill(null).map((_, qIndex) => ({
            text: `Question ${qIndex + 1} for module ${moduleIndex + 1}`,
            choices: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0
          }));
        }

        // Create and save the quiz
        const quiz = new Quiz({ courseSlug, moduleIndex, questions });
        await quiz.save();
        console.log(`Quiz created for ${courseSlug} module ${moduleIndex}`);
      }
    }

    // Create live classes
    console.log('Creating live classes...');
    let allLiveClasses = [];
    
    // Generate live classes for each course
    for (const courseSlug of Object.keys(coursesData)) {
      if (courseToSeed && courseSlug !== courseToSeed) continue;
      const liveClasses = generateLiveClasses(courseSlug, 3);
      allLiveClasses = [...allLiveClasses, ...liveClasses];
    }
    
    // Save all live classes
    for (const liveClassData of allLiveClasses) {
      const liveClass = new LiveClass(liveClassData);
      await liveClass.save();
      console.log(`Live class created: ${liveClass.title} (${liveClass._id})`);
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Execute the seed function
seed();