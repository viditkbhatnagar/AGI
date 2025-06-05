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
 *   • With no arg, the script keeps the original “nuke & pave” behaviour.
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
            title: "Fleet Management Transportation & Logistics MS Excel Dashboard",
            duration: 35,
            url: "https://www.youtube.com/watch?v=vJX2W3I1_8o",
          }
        ],
        documents: [
          {
            title: "Quantitative vs. Qualitative",
            url: "https://drive.google.com/file/d/16swk5anmdm2sH0h35Dks5qOVCj4K_4ll/preview"
          },
          {
            title: "Senior Strategic Business Research (CLM-102)",
            url: "https://drive.google.com/file/d/1t0-oe3vdB9MS6o2ht75Mt9hNZWOcS93U/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Change Management (CLM-103)",
        videos: [
          {
            title: "10 Change Management Models Explained in 10 Minutes",
            duration: 10,
            url: "https://www.youtube.com/watch?v=t1JiPdor_rU&t=96s",
          }
        ],
        documents: [
          {
            title: "Change Management",
            url: "https://drive.google.com/file/d/1uxSTvGXc4o0MOrPrYyfx85yQr_CgP0hi/preview"
          },
          {
            title: "Senior Strategic Change Management (CLM-103)",
            url: "https://drive.google.com/file/d/1pOy2xZFLomoxITa0olZlJFvP01tnRht_/preview"
          }
        ],
      },
      {
        title: "Business Innovation and Entrepreneurship",
        videos: [
          {
            title: "Venture Capital EXPLAINED",
            duration: 10,
            url: "https://www.youtube.com/watch?v=ZEcg1X_ErN0",
          }
        ],
        documents: [
          {
            title: "Innovation and Entrepreneurship Theory, Policy and Practice",
            url: "https://drive.google.com/file/d/136eoa0r06hD6BDkyVA9X7xylDwmm6EYb/preview"
          },
          {
            title: "Business Innovation and Entrepreneurship (CLM-104)",
            url: "https://drive.google.com/file/d/1w6f_GpFQMelImAyiJREgoGurCtlowCYN/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Manufacturing & Production Principles",
        videos: [
          {
            title: "What is Industry 4.0? | What are the key Industry 4.0 technologies| All explained in 10 minutes",
            duration: 11,
            url: "https://www.youtube.com/watch?v=bNfZWqDLW0Q",
          },
          {
            title: "DMAIC Case Study Warehouse Example - Lean Six Sigma case study Example",
            duration: 5,
            url: "https://www.youtube.com/watch?v=r8IBN75RX0M",
          },
          {
            title: "How to do logistics Resource Planning",
            duration: 8,
            url: "https://www.youtube.com/watch?v=uroZOwEYX-Q",
          }
        ],
        documents: [
          {
            title: "Six Sigma A Complete Step by Step Guide",
            url: "https://drive.google.com/file/d/1Cc-Y6r3KdcJYIAUkzqk_OeRuHIoyIo5Q/preview"
          },
          {
            title: "Senior Strategic Manufacturing & Production Principles (CLM-105)",
            url: "https://drive.google.com/file/d/1Wh5pJOMb_8_XY8pC_Cy5EYiOOBYEF87q/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Business Planning guides",
        videos: [
          {
            title: "Balanced Scorecard (With A Step-by-Step Example)",
            duration: 11,
            url: "https://www.youtube.com/watch?v=W1i59QkU-Ss",
          },
          {
            title: "Utilizing SWOT, PESTEL, and Five Forces Analyses in Your Strategic Planning",
            duration: 8,
            url: "https://www.youtube.com/watch?v=G0dR4nI9dsQ",
          },
          {
            title: "How To develop great KPIs (Key Performance Indicators) for your business, department or project",
            duration: 12,
            url: "https://www.youtube.com/watch?v=JN_EZU_Iyrg",
          }
        ],
        documents: [
          {
            title: "BSC",
            url: "https://drive.google.com/file/d/160Sb4OZ7OG3e7UPyz5UcrcIHY-4uvH-F/preview"
          },
          {
            title: "PESTLE",
            url: "https://drive.google.com/file/d/19Ohcq_X0MCxoBBFWwINOrcOMKwXXQ0y_/preview"
          },
          {
            title: "Senior Strategic Business Planning (CLM-106)",
            url: "https://drive.google.com/file/d/1o6WqahoO0OCv7UKKJ0A4jjXxe1JTR4Y9/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Global Procurement",
        videos: [
          {
            title: "Reshoring Trend: Why Companies are Bringing Manufacturing Back Home",
            duration: 6,
            url: "https://www.youtube.com/watch?v=fSwKofBUfGY&t=61s",
          },
          {
            title: "Sustainable Procurement What You Should Know in 2025",
            duration: 5,
            url: "https://www.youtube.com/watch?v=KZA2UIjEDVE",
          },
          {
            title: "Sustainable Procurement Explained: Key Frameworks and Benefits",
            duration: 22,
            url: "https://www.youtube.com/watch?v=U1E6rtnreoA",
          }
        ],
        documents: [
          {
            title: "Global Purchasing and Supply Management",
            url: "https://drive.google.com/file/d/1mz3ZRiKwxCLuFnyVx3K7mK8iZiKUsBMe/preview"
          },
          {
            title: "Senior Strategic Global Procurement (CLM-107)",
            url: "https://drive.google.com/file/d/10B-MhWP6eaS7JYl6ks97G_ju6IYVLoe_/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Leadership",
        videos: [
          {
            title: "10 Most Common Types of Leadership Styles (With Real-World Examples)",
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
            title: "Senior Strategic Leadership (CLM-108)",
            url: "https://drive.google.com/file/d/1ZlDY96nzmd2Iz5-gxK2D57MRxVL4etz9/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Management Principles",
        videos: [
          {
            title: "Blue Ocean Strategy (With Real World Examples)",
            duration: 10,
            url: "https://www.youtube.com/watch?v=j-b7MHabLPg&t=31s",
          },
          {
            title: "Internal Analysis: The VRIO Framework | Strategic Management",
            duration: 9,
            url: "https://www.youtube.com/watch?v=afrPC91zCkQ",
          },
          {
            title: "McKinsey 7S Framework",
            duration: 11,
            url: "https://www.youtube.com/watch?v=DFNJypMOIMI",
          },
          {
            title: "HOSHIN KANRI (X MATRIX) WITH TEMPLATE ",
            duration: 8,
            url: "https://www.youtube.com/watch?v=clYFo2j1m7A",
          }
        ],
        documents: [
          {
            title: "Strategic Management",
            url: "https://drive.google.com/file/d/1EQr5Jf-OFUbxKqu9M3wnMZF4TPe-DKqI/preview"
          },
          {
            title: "Senior Strategic Management Principles (CLM-109)",
            url: "https://drive.google.com/file/d/14hPglNIwmWUhgSG3x-wAWykzD3arOSjZ/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Maritime Management",
        videos: [
          {
            title: "Incoterms 2020 Explained [Complete Guide]",
            duration: 12,
            url: "https://www.youtube.com/watch?v=GTUTLRXcVuA",
          },
          {
            title: "Explained Sea Shipment/Marine Transportation flow for Beginners",
            duration: 9,
            url: "https://www.youtube.com/watch?v=fK6aeyEQMGk",
          }
        ],
        documents: [
          {
            title: "ICC INCOTERMS 2020",
            url: "https://drive.google.com/file/d/1YdXRMjZYHFF7_hZ9vMZKjOSGt48plKN-/preview"
          },
          {
            title: "Senior Strategic Maritime Management (CLM-110)",
            url: "https://drive.google.com/file/d/1qv9h1ZcNuo3kSwRb7Dazkj9kZ89yFKtc/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Quality Management",
        videos: [
          {
            title: "Explanation of the EFQM Model",
            duration: 8,
            url: "https://www.youtube.com/watch?v=evuEcypUnDQ",
          },
          {
            title: "Lean vs TQM | Lean vs Total Quality Management",
            duration: 3,
            url: "https://www.youtube.com/watch?v=fSLXnG6TgNc",
          }
        ],
        documents: [
          {
            title: "QM",
            url: "https://drive.google.com/file/d/1wTJPA_7QqDG3tOigSyLudKNa6cX-sZVW/preview"
          },
          {
            title: "Senior Strategic Quality Management (CLM-111)",
            url: "https://drive.google.com/file/d/1KLgx7Sn8xGrCGGh3flsWBInMybsN-ywu/preview"
          }
        ],
      },
      {
        title: "Senior Strategic Warehousing & Inventory Management",
        videos: [
          {
            title: "Inventory Management",
            duration: 11,
            url: "https://www.youtube.com/watch?v=0NOER-Lle-0",
          },
          {
            title: "Inside Amazon's Smart Warehouse",
            duration: 11,
            url: "https://www.youtube.com/watch?v=IMPbKVb8y8s",
          }
        ],
        documents: [
          {
            title: "Essentials of Inventory Management",
            url: "https://drive.google.com/file/d/1DaLbloB4PXrRLX9-DrTH56je8GZwzQVz/preview"
          },
          {
            title: "Senior Strategic Warehousing & Inventory Management (CLM-112)",
            url: "https://drive.google.com/file/d/1I0s9M3rxYWMLYOJBKsq3Eu_CIxdAMVW9/preview"
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
    description: "AGI’s Certified Sustainability Management program provides in-depth knowledge of sustainable practices, environmental policy, and corporate responsibility, preparing you to lead initiatives for a sustainable future.",
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
    description: "AGI’s Certified Project Manager program equips you with the advanced skills needed to manage projects effectively acros.",
    modules: [
      {
        title: "Fundamentals of Project Management",
        videos: [
          {
            title: "Fundamentals of Project Management",
            duration: 50,
            url: "https://www.youtube.com/watch?v=aoCrIr0GbEM",
          }
        ],
        documents: [
          {
            title: "PM-101 Fundamentals of Project Management",
            url: "https://docs.google.com/presentation/d/1hnajzEV48hHi2iV-pxztv4PT7T2Hc70U/preview"
          }
        ],
      },
      {
        title: "Project Integration Management",
        videos: [
          {
            title: "Project Integration Management",
            duration: 10,
            url: "https://www.youtube.com/watch?v=l1B5t2EJC4c",
          }
        ],
        documents: [
          {
            title: "PM-102 Project Integration and Initiation",
            url: "https://docs.google.com/presentation/d/1-BvMtXndER-CvwKycFx1bBgpeyLt_Ilc/preview"
          }
        ],
      },
      {
        title: "Saving your company and saving your planet",
        videos: [
          {
            title: "Project Scope Management",
            duration: 7,
            url: "https://www.youtube.com/watch?v=KPIT1RglSHs",
          }
        ],
        documents: [
          {
            title: "PM-103 Project Scope Management",
            url: "https://docs.google.com/presentation/d/16xObXzXu0aEABfs1i5bb_UtJNdU_VOqx/preview"
          }
        ],
      },
      {
        title: "Project Schedule Management",
        videos: [
          {
            title: "Project Schedule Management Overview",
            duration: 11,
            url: "https://www.youtube.com/watch?v=CEBO4k6Tnqg",
          }
        ],
        documents: [
          {
            title: "PM-104 Project Schedule Management",
            url: "https://docs.google.com/presentation/d/1hvmQddUYDQODwlg3iuFJAEH_WE90OXmw/preview"
          }
        ],
      },
      {
        title: "The Basics of Project Cost Management",
        videos: [
          {
            title: "The Basics of Project Cost Management - Project Management Training",
            duration: 6,
            url: "https://www.youtube.com/watch?v=EyPFi0YO32M",
          }
        ],
        documents: [
          {
            title: "PM-105 Project Cost Management",
            url: "https://docs.google.com/presentation/d/1UtpJUk8mQz2dbTrhxe7NLya0_t_iTkse/preview"
          }
        ],
      },
      {
        title: "Project Quality Management",
        videos: [
          {
            title: "Project Quality Management Overview",
            duration: 11,
            url: "https://www.youtube.com/watch?v=Q7YJ-_OJIZQ",
          }
        ],
        documents: [
          {
            title: "PM-106 Project Quality Management",
            url: "https://docs.google.com/presentation/d/1eT2sEdSsDwgV6WlM1aLEmB1qM0R825KR/preview"
          }
        ],
      },
      {
        title: "Project Resource Management",
        videos: [
          {
            title: "Mastering Project Resource Management: Tips for Success",
            duration: 8,
            url: "https://www.youtube.com/watch?v=-_2Y-qU1O1I",
          }
        ],
        documents: [
          {
            title: "PM-107 Project Resource Management",
            url: "https://docs.google.com/presentation/d/1-pEHGw-UppZHYpqtAvZYBJzmXEtXKz4q/preview"
          }
        ],
      },
      {
        title: "Project Communications Management",
        videos: [
          {
            title: "Project Communications Management Overview",
            duration: 12,
            url: "https://www.youtube.com/watch?v=S2lLKYV4e6M",
          }
        ],
        documents: [
          {
            title: "PM-108 Project Communication Management",
            url: "https://docs.google.com/presentation/d/1MwAZLszYSgcf3juN0RsJS3AvuaHTt3Yp/preview"
          }
        ],
      },
      {
        title: "Project Risk Management",
        videos: [
          {
            title: "RISK MANAGEMENT 101: An Introduction to Project Risk Management",
            duration: 12,
            url: "https://www.youtube.com/watch?v=Nwl7PquhU5U",
          }
        ],
        documents: [
          {
            title: "PM-109 Project Risk Management",
            url: "https://docs.google.com/presentation/d/1dRLDTgISO7lv_zoGBbt18NgMfyn7CzcL/preview"
          }
        ],
      },
      {
        title: "Project Procurement Management",
        videos: [
          {
            title: "Project Procurement Management Overview",
            duration: 10,
            url: "https://www.youtube.com/watch?v=Ig0uVNXhR9Q",
          }
        ],
        documents: [
          {
            title: "PM-110 Project Procurement Management",
            url: "https://docs.google.com/presentation/d/1Uq1EJLsMQJX0OkmCUm7TehizEmT7skvQ/preview"
          }
        ],
      },
      {
        title: "Agile Frameworks and Methodologies",
        videos: [
          {
            title: "What Is Agile Methodology? | Introduction to Agile Methodology in Six Minutes",
            duration: 6,
            url: "https://www.youtube.com/watch?v=8eVXTyIZ1Hs",
          }
        ],
        documents: [
          {
            title: "PM-111 Agile Frameworks and Methodologies",
            url: "https://docs.google.com/presentation/d/1eFNHsTe-CTbfLBlmEu098722-yl4gPhk/preview"
          }
        ],
      },
      {
        title: "Business Analysis for Project Management",
        videos: [
          {
            title: "Business Analysis for Project Managers",
            duration: 30,
            url: "https://www.youtube.com/watch?v=UitWvBThl_4",
          }
        ],
        documents: [
          {
            title: "PM-112 Business Analysis for Project Management",
            url: "https://docs.google.com/presentation/d/1mXdAbdulk4N6vS8cLWA7e7WQVd0TrPOS/preview"
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
            title: "Build Your Organization’s Strategic Project Management Capability",
            duration: 57,
            url: "https://www.youtube.com/watch?v=cKJRN51UYMM",
          }
        ],
        documents: [
          {
            title: "Strategic Project Management Made Simple",
            url: "https://drive.google.com/file/d/1ac5flwP-KNYTcLtWkWxeLpiFCLN0Td0_/preview"
          },
          {
            title: "Strategic Delivery Capability",
            url: "https://drive.google.com/file/d/1ajO9DK63yHezbLDGivnrINmmlF0JgK0H/preview"
          }
        ],
      },
      {
        title: "Project Management Empowers Humanitarian and Social Missions",
        videos: [
          {
            title: "Introduction to Managing Humanitarian Aid Projects",
            duration: 15,
            url: "https://www.youtube.com/watch?v=rWfyLvUojns",
          },
          {
            title: "Project Management",
            duration: 3,
            url: "https://www.youtube.com/watch?v=alOczlnWl1Q",
          },
          {
            title: "Driving Change: Project Management for Social Impact",
            duration: 6,
            url: "https://www.youtube.com/watch?v=bPTfk0juGBA",
          },
          {
            title: "Theory of Change: Framework for Social Impact",
            duration: 7,
            url: "https://www.youtube.com/watch?v=cg4J1g0IVHg",
          }
        ],
        documents: [
          {
            title: "Project Management In Non Govermental Organizations NGOs",
            url: "https://drive.google.com/file/d/1V7ikfYp5WghtLkIIAO6sNKbbrMa1OrHL/preview"
          },
          {
            title: "Project Management Empowers Humanitarian and Social Missions",
            url: "https://drive.google.com/file/d/1NDOSu7o5L2BxoLym2g2zk9td3fTC6al2/preview"
          }
        ],
      },
      {
        title: "Project Management is Creating Innovative Culture",
        videos: [
          {
            title: "How to create a culture of innovation",
            duration: 3,
            url: "https://www.youtube.com/watch?v=-eM0sNLPY_8",
          },
          {
            title: "How to Create a Culture of Innovation",
            duration: 31,
            url: "https://www.youtube.com/watch?v=saBl3waK70Q",
          }
        ],
        documents: [
          {
            title: "Creating Innovation Culture",
            url: "https://drive.google.com/file/d/1bcsHxYUdWN5g2BOzAbLCxeqM9K8Amt6a/preview"
          },
          {
            title: "Project Management is Creating Innovative Culture",
            url: "https://drive.google.com/file/d/11jEwM3eXRn25o-JzhC4kuL1WBHtydpsp/preview"
          }
        ],
      },
      {
        title: "Digitization is Central to Delivering Projects",
        videos: [
          {
            title: "Transforming Project Delivery",
            duration: 2,
            url: "https://www.youtube.com/watch?v=d-7DCrvRgsY",
          },
          {
            title: "Digital Transformation Basics for Project Managers",
            duration: 5,
            url: "https://www.youtube.com/watch?v=jcDG7kat2BA",
          }
        ],
        documents: [
          {
            title: "Digitization is Central to Delivering Projects's Promises",
            url: "https://drive.google.com/file/d/1HtQVq9mZl-dP8zuxEDuWEZMnh9y0Jn8M/preview"
          }
        ],
      },
      {
        title: "Evolving Project Manager's Skills",
        videos: [
          {
            title: "Project Manager Roadmap: Skills You MUST Learn TODAY",
            duration: 10,
            url: "https://www.youtube.com/watch?v=Qfgs-b0bQ6Q",
          }
        ],
        documents: [
          {
            title: "Project Management Skills",
            url: "https://drive.google.com/file/d/1yFutvx8MH8DTFm04BqKuTYKP-K1Ix0UM/preview"
          },
          {
            title: "Evolving Project Manager's Skills",
            url: "https://drive.google.com/file/d/1A4hDKoBznQQASwfmOCBjtStKrKjKAJCq/preview"
          }
        ],
      },
      {
        title: "New Forms Of Project Leadership",
        videos: [
          {
            title: "Top 5 Leadership Theories - Project Management Training",
            duration: 8,
            url: "https://www.youtube.com/watch?v=I49T7eteX28",
          }
        ],
        documents: [
          {
            title: "The Art Of Project Leadership",
            url: "https://drive.google.com/file/d/1vUuoWH7_56w1Rlcud3pHSGaGRNg6ApTz/preview"
          },
          {
            title: "New Forms Of Project Leadership",
            url: "https://drive.google.com/file/d/12spQKLs3XvBTmqdjrdqeVrH6dopsTbrY/preview"
          }
        ],
      },
      {
        title: "Organizational Cultural Shift To The Project Way Of Working",
        videos: [
          {
            title: "Project Management",
            duration: 8,
            url: "https://www.youtube.com/watch?v=Oh1CuAWnvnA",
          }
        ],
        documents: [
          {
            title: "Project Culture",
            url: "https://drive.google.com/file/d/1pkfnrVtia8FK1aAaITi-B6jyqn5sdREh/preview"
          },
          {
            title: "Organizational Cultural Shift To The Project Way Of Working",
            url: "https://drive.google.com/file/d/1r4NN3f7MlFGb5PfuL2D9jyUOgBgWH_LJ/preview"
          }
        ],
      },
      {
        title: "Adaptive Frameworks And Life Cycles",
        videos: [
          {
            title: "Adaptive Projects Framework (APF)",
            duration: 5,
            url: "https://www.youtube.com/watch?v=AYqEE9uUO_Y",
          },
          {
            title: "Types of Project Management Life Cycle - Adaptive, Predictive, Iterative, Incremental and Hybrid",
            duration: 16,
            url: "https://www.youtube.com/watch?v=I4fAFcPCw6k",
          },
          {
            title: "What Does Agile PPM Mean To The Modern PMO?",
            duration: 38,
            url: "https://www.youtube.com/watch?v=sEOq681jBR0",
          },
          {
            title: "Project Management: Waterfall, Agile, & Hybrid Approaches",
            duration: 15,
            url: "https://www.youtube.com/watch?v=bLZ9MNwV2vE",
          }
        ],
        documents: [
          {
            title: "Project Lifecycle",
            url: "https://drive.google.com/file/d/1HmgXncxq99tUQhAaBjPCDuKKQ_-qLS3E/preview"
          },
          {
            title: "Adaptive Frameworks And Life Cycles",
            url: "https://drive.google.com/file/d/1eN7Aqji7r7C9p5CENFiP39lzmfboARg6/preview"
          }
        ],
      },
      {
        title: "Evolving Nature of PMOs And Governance",
        videos: [
          {
            title: "The Evolving Role of the PMO - from PMO Learning",
            duration: 60,
            url: "https://www.youtube.com/watch?v=7HapUBjPnG8",
          }
        ],
        documents: [
          {
            title: "Beyond Governance PMO Interviews",
            url: "https://drive.google.com/file/d/1nGPZxm2eY11Bw3GzSvQhANaa4eOql0lI/preview"
          },
          {
            title: "PMOS Play Vital Role",
            url: "https://drive.google.com/file/d/1rvta0oAVOLMoPqw6lH4ze5Y_KttehS2p/preview"
          },
          {
            title: "Evolving Nature of PMOs And Governance",
            url: "https://drive.google.com/file/d/1Fd9wMi6ruQvnEjCBviWpAN5r-kn1mVFD/preview"
          }
        ],
      },
      {
        title: "Significant Growth In Value-Driven And Business-Related Metrics",
        videos: [
          {
            title: "Top 3 KPIs for Project Managers",
            duration: 4,
            url: "https://www.youtube.com/watch?v=f_szFzBjfFg",
          },
          {
            title: "Top 5 KPIs for Project Managers",
            duration: 8,
            url: "https://www.youtube.com/watch?v=SwGt4nbTxgM",
          }
        ],
        documents: [
          {
            title: "Project Management Metrics KPIs",
            url: "https://drive.google.com/file/d/1u6ili6L0D7EjTNoQlmmTAKwGR9oYYVI9/preview"
          },
          {
            title: "Significant Growth In Value-Driven And Business Related Metrics",
            url: "https://drive.google.com/file/d/1aMAyDwuFYVP_vUmzOQbvWNKtAYL59b9p/preview"
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
  "Certified-Logistics-Manager": (() => {
    // helper to build one‑question arrays for 12 modules
    const build = () => ({
      prompt: "Click any option to go to the next module",
      options: ["Click me", "Click me", "Click me", "Click me"],
      correctIndex: -1, // -1 means “all choices correct”
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
      9: [build()],
      10: [build()],
      11: [build()],
    };
  })(),
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
          "It gives feedback only from the employee’s manager",
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
        prompt: "According to Lewin’s Change Model, what is the purpose of the “Unfreeze” stage?",
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
        prompt: "What does ‘Equity’ refer to in the context of DEI?",
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
      correctIndex: -1, // -1 means “all choices correct”
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
  "Certified-Project-Manager": (() => {
    // helper to build one‑question arrays for 12 modules
    const build = () => ({
      prompt: "Click any option to go to the next module",
      options: ["Click me", "Click me", "Click me", "Click me"],
      correctIndex: -1, // -1 means “all choices correct”
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
      9: [build()],
      10: [build()],
      11: [build()]
    };
  })(),
  "Certified-Project-Management-Professional": (() => {
    // helper to build one‑question arrays for 12 modules
    const build = () => ({
      prompt: "Click any option to go to the next module",
      options: ["Click me", "Click me", "Click me", "Click me"],
      correctIndex: -1, // -1 means “all choices correct”
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
  })()
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
        `Selective seeding – keeping existing data; will upsert course “${courseToSeed}”`
      );
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