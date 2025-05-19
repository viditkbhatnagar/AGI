/**
 * Comprehensive database seeding script
 * - Creates users, students, courses, enrollments, and live classes
 * - Adds real course data for Certified Investment Associate and Certified Supply Chain Professional
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
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
    
    // Delete all existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});
    await LiveClass.deleteMany({});
    await Quiz.deleteMany({});
    console.log('Quizzes cleared');
    
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

    // Create courses from data
    console.log('Creating courses...');
    const coursePromises = Object.values(coursesData).map(async (courseData) => {
      const course = new Course(courseData);
      await course.save();
      console.log(`Course created: ${course.title} (${course._id})`);
      return course;
    });

    const courses = await Promise.all(coursePromises);

    // Seed quizzes for each course module
    console.log('Seeding quizzes for each course module...');
    for (const [courseSlug, courseObj] of Object.entries(coursesData)) {
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
    
    // Create live classes
    console.log('Creating live classes...');
    let allLiveClasses = [];
    
    // Generate live classes for each course
    for (const courseSlug of Object.keys(coursesData)) {
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