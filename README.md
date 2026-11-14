# SplitFlow

### Automated Payment Splitting and Settlement Management for Businesses

SplitFlow is a merchant-focused payment orchestration platform that enables businesses to receive customer payments and automatically distribute the funds among multiple beneficiaries using predefined split rules.

Instead of manually calculating commissions, tracking partner payments, and reconciling revenue across multiple accounts, merchants can configure how incoming payments should be distributed. SplitFlow integrates with **Paystack** to process payments and distribute settlements to beneficiary subaccounts.

It also uses AI-assisted workflows to help merchants create split rules and research payment-provider capabilities.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [How SplitFlow Works](#how-splitflow-works)
- [Example Use Case](#example-use-case)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [AI Integration](#ai-integration)
- [Payment Processing](#payment-processing)
- [API Overview](#api-overview)
- [Database Design](#database-design)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [Security and Reliability](#security-and-reliability)
- [Current Scope and Limitations](#current-scope-and-limitations)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Businesses that work with multiple stakeholders often need to distribute incoming payments among sellers, delivery partners, service providers, platform operators, and other beneficiaries.

Handling these distributions manually introduces operational overhead, reconciliation difficulties, and the risk of incorrect allocations.

SplitFlow provides a centralized system for defining payment distribution rules and applying them when customers make payments.

A merchant can:

1. Register a business.
2. Add beneficiaries and their bank details.
3. Create payment split rules.
4. Generate customer payment links or checkout sessions.
5. Allow Paystack to process payments and handle configured subaccount settlement.
6. Track payment records, allocations, and settlement information.

SplitFlow is designed around a simple principle:

**One customer payment. Multiple predefined beneficiaries. Automated distribution.**

---

## The Problem

Many businesses operate using revenue-sharing arrangements.

For example:

- A marketplace needs to distribute revenue between sellers and the platform.
- A logistics business needs to allocate delivery fees to delivery partners.
- A service platform needs to distribute customer payments between professionals and the platform.
- An online commerce business needs to split revenue among vendors and service providers.

Without an automated system, businesses may need to:

- Calculate each beneficiary's share manually.
- Initiate multiple transfers after receiving payments.
- Maintain separate spreadsheets for revenue distribution.
- Track payment statuses across multiple systems.
- Investigate discrepancies between expected and actual settlements.

These processes become increasingly difficult as transaction volumes and the number of beneficiaries grow.

## Our Solution

SplitFlow centralizes payment distribution through configurable split rules.

Merchants define the beneficiaries who should receive a share of each transaction and specify how much each beneficiary should receive.

When a customer makes a payment, SplitFlow uses the configured payment integration to process the transaction and apply the corresponding distribution instructions.

The platform also provides visibility into payments, expected allocations, and settlement reconciliation.

---

## Key Features

### 1. Merchant Management

Businesses can register and manage their merchant accounts.

Each merchant has an isolated workspace for managing:

- Beneficiaries.
- Payment split rules.
- Customer payments.
- Payment allocations.
- Settlement and reconciliation records.

### 2. Beneficiary Management

Merchants can register individuals or businesses that should receive a portion of customer payments.

Beneficiary information includes:

- Beneficiary name.
- Email address.
- Bank name.
- Bank account number.
- Bank code.
- Beneficiary type.
- Paystack subaccount reference.
- Account status.

SplitFlow uses Paystack subaccounts to identify the beneficiary accounts involved in payment distribution.

### 3. Configurable Split Rules

Merchants can define how payments should be distributed.

Split rules support:

- Percentage-based allocations.
- Fixed-amount allocations.
- Multiple beneficiaries.
- Merchant-specific rules.
- Rule previews before use.

For percentage-based rules, merchants can assign a percentage of the transaction to each beneficiary.

For fixed-amount rules, merchants can define specific allocation amounts, subject to the transaction amount and provider constraints.

The system validates allocations before payment processing.

### 4. Automated Payment Distribution

SplitFlow integrates with Paystack to initialize customer payments using the configured split instructions and beneficiary subaccounts.

Once a customer completes payment, Paystack handles the applicable settlement distribution.

This eliminates the need for SplitFlow to initiate duplicate transfers for allocations already handled by Paystack.

### 5. Payment Tracking

Merchants can view their payment records, including:

- Payment reference.
- Customer email.
- Transaction amount.
- Currency.
- Payment status.
- Associated split rule.
- Distribution information.
- Transaction timestamps.

### 6. Settlement Reconciliation

SplitFlow provides visibility into payment allocations and settlement records.

Merchants can review expected beneficiary distributions and investigate discrepancies.

Importantly, an allocation record does not independently prove that funds have arrived in a beneficiary's bank account. Settlement confirmation must be based on appropriate payment-provider evidence.

### 7. AI-Assisted Split Rule Creation

Merchants can describe their intended payment distribution in natural language.

For example:

"I want 65% of every payment to go to the seller, 20% to the platform, and 15% to delivery."

SplitFlow uses its AI integration to help translate the instruction into a structured draft split rule.

The merchant reviews the proposed beneficiaries and percentages before saving the rule.

AI-generated rules are suggestions, not payment authorization.

### 8. Payment Intelligence and Research

SplitFlow provides an intelligence workflow for researching payment-provider capabilities and related payment information.

It uses Tavily to retrieve relevant external information and can present findings to merchants or administrators.

---

## How SplitFlow Works

<details>
<summary>Payment distribution workflow</summary>

```mermaid
flowchart TD
    A[Merchant registers] --> B[Adds beneficiaries]
    B --> C[Paystack subaccounts created]
    C --> D[Merchant creates split rule]
    D --> E[SplitFlow validates rule]
    E --> F[Customer initiates payment]
    F --> G[SplitFlow initializes Paystack transaction]
    G --> H[Customer completes checkout]
    H --> I[Paystack processes payment]
    I --> J[Paystack handles configured settlement split]
    J --> K[SplitFlow records payment and allocations]
    K --> L[Merchant reviews reconciliation]
```

</details>

### Step 1: Merchant Registration

A business registers on SplitFlow and receives a merchant account.

### Step 2: Add Beneficiaries

The merchant adds the beneficiaries who should receive a share of payments.

SplitFlow creates the corresponding Paystack subaccounts where supported and stores the returned subaccount references.

### Step 3: Configure Split Rules

The merchant creates a rule specifying how incoming payments should be distributed.

The platform validates the rule before allowing it to be used.

### Step 4: Initialize Payment

When a customer is ready to pay, SplitFlow initializes a Paystack transaction using the merchant's payment configuration and applicable split instructions.

### Step 5: Customer Checkout

The customer is redirected to Paystack's checkout page to complete the transaction.

### Step 6: Payment Verification

SplitFlow verifies the payment with Paystack and records the resulting transaction status.

### Step 7: Distribution Tracking

SplitFlow records the expected allocation information associated with the transaction.

Paystack handles settlement according to its configured split and subaccount arrangements.

### Step 8: Reconciliation

The merchant reviews transaction and settlement information through the dashboard.

---

## Example Use Case

Consider an online marketplace that receives a customer payment of ₦100,000.

The merchant has configured the following split rule:

| Beneficiary | Allocation | Amount |
|---|---:|---:|
| Seller | 65% | ₦65,000 |
| Platform | 20% | ₦20,000 |
| Delivery partner | 15% | ₦15,000 |
| **Total** | **100%** | **₦100,000** |

When the customer pays ₦100,000:

1. SplitFlow initializes the payment with the configured Paystack split instructions.
2. The customer completes checkout.
3. Paystack processes the payment.
4. Paystack applies the configured subaccount settlement arrangement.
5. SplitFlow records the transaction and its allocation details.

The merchant can then inspect the payment and its associated distributions.

*The example excludes provider fees, taxes, reversals, and other adjustments. Actual settlement amounts depend on Paystack's applicable rules and configuration.*

---

## System Architecture

SplitFlow follows a modular architecture with separate frontend and backend applications.

### Frontend

The frontend provides the merchant-facing dashboard and communicates with the backend through REST APIs.

Its responsibilities include:

- Merchant onboarding.
- Beneficiary management.
- Split rule configuration.
- Payment initiation.
- Payment history.
- Settlement reconciliation.
- AI-assisted split rule creation.
- Payment intelligence.

### Backend

The backend is built with NestJS and manages the core business logic.

Its responsibilities include:

- Merchant management.
- Beneficiary registration.
- Paystack subaccount creation.
- Split rule validation.
- Payment initialization.
- Payment verification.
- Payment allocation records.
- Ledger operations.
- Payout and reconciliation workflows.
- AI orchestration.

### Payment Provider

Paystack handles payment processing and configured subaccount settlement.

The backend communicates with Paystack using server-side credentials.

### AI and Research Services

Bifrost provides the AI gateway for natural-language processing and structured split-rule drafting.

Tavily provides web research capabilities for payment-provider intelligence.

```mermaid
flowchart TB
    U[Merchant] --> FE[SplitFlow Frontend]
    FE --> API[NestJS Backend API]

    API --> DB[(PostgreSQL)]
    API --> PS[Paystack Integration]
    API --> AI[Bifrost AI Gateway]
    API --> TV[Tavily Research]

    PS --> C[Customer Checkout]
    PS --> S[Beneficiary Subaccounts]

    API --> L[Ledger and Reconciliation]
    L --> DB
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Frontend language | TypeScript |
| Backend | NestJS |
| Backend language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Payment provider | Paystack |
| AI gateway | Bifrost |
| Web research | Tavily |
| API architecture | REST |
| Containerization | Docker |

---

## AI Integration

SplitFlow uses AI to improve the merchant experience without handing financial decisions to an AI model.

### Bifrost

Bifrost acts as the AI gateway.

It supports natural-language processing for merchant payment distribution instructions.

Example:

```text
Merchant instruction:

Split customer payments into:
65% for the seller,
20% for the platform,
15% for delivery.
```

The AI workflow produces a structured draft that the backend can validate.

Example conceptual output:

```json
{
  "name": "Marketplace Revenue Split",
  "allocations": [
    {
      "beneficiary": "Seller",
      "percentage": 65
    },
    {
      "beneficiary": "Platform",
      "percentage": 20
    },
    {
      "beneficiary": "Delivery",
      "percentage": 15
    }
  ]
}
```

The backend checks the draft against actual registered beneficiaries and split-rule constraints before saving it.

### Tavily

Tavily powers payment intelligence and research.

It can help retrieve information about:

- Payment-provider capabilities.
- Payment processing documentation.
- Transaction fee structures.
- Settlement policies.
- Supported payment features.

Research results are informational and do not replace verified provider configuration or financial calculations.

### AI Safety Boundary

AI does not:

- Hold payment-provider credentials.
- Calculate authoritative payment allocations.
- Authorize customer payments.
- Execute transfers.
- Confirm successful settlements.

All financial calculations and payment operations remain under deterministic backend control.

---

## Payment Processing

SplitFlow uses Paystack's subaccount and split-payment capabilities.

### Beneficiary Subaccounts

When a merchant registers a beneficiary, the backend can create a corresponding Paystack subaccount.

The returned subaccount code is stored and associated with the beneficiary.

### Split Rule Application

A merchant's split rule identifies the beneficiaries and their allocation values.

The backend translates the rule into the appropriate Paystack payment configuration.

Percentage values are represented internally in basis points where applicable:

- 65% = 6500 basis points.
- 20% = 2000 basis points.
- 15% = 1500 basis points.

The backend converts the values into the format required by Paystack.

### Payment Initialization

The backend initializes a Paystack transaction and returns a checkout URL.

The frontend redirects the customer to that URL.

### Payment Verification

After checkout, the frontend can return the customer to the payment callback page.

The backend verifies the transaction with Paystack before treating it as successful.

The application should never rely solely on a frontend redirect to establish payment success.

### Settlement

Paystack is responsible for the configured settlement distribution.

SplitFlow tracks payment and allocation records and supports reconciliation. It should not initiate duplicate transfers for the same allocations.

---

## API Overview

The backend exposes REST endpoints for merchant operations.

The following endpoints describe the intended API surface.

### Merchants

| Method | Endpoint | Description |
|---|---|---|
| POST | `/merchants` | Register a merchant |
| GET | `/merchants` | List merchants |
| GET | `/merchants/:id` | Retrieve merchant details |

### Beneficiaries

| Method | Endpoint | Description |
|---|---|---|
| POST | `/beneficiaries` | Register a beneficiary |
| GET | `/beneficiaries` | List beneficiaries |
| GET | `/beneficiaries/:id` | Retrieve beneficiary details |
| PATCH | `/beneficiaries/:id/status` | Update beneficiary status |

### Split Rules

| Method | Endpoint | Description |
|---|---|---|
| POST | `/split-rules` | Create a split rule |
| GET | `/split-rules` | List split rules |
| GET | `/split-rules/:id` | Retrieve a split rule |
| POST | `/split-rules/preview` | Preview an allocation |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments` | Initialize a customer payment |
| GET | `/payments` | List payments |
| GET | `/payments/:reference` | Retrieve a payment |
| GET | `/payments/:reference/verify` | Verify a transaction |
| POST | `/payments/:reference/confirm` | Confirm a payment |
| POST | `/payments/:reference/confirm-sandbox` | Confirm a sandbox payment |

### Payouts and Reconciliation

| Method | Endpoint | Description |
|---|---|---|
| GET | `/payouts` | List payout or settlement records |
| POST | `/payouts/:id/retry` | Retry a supported payout operation |

### AI

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/draft-split-rule` | Generate a draft split rule |
| POST | `/ai/assistant` | Interact with the AI assistant |

### Intelligence

| Method | Endpoint | Description |
|---|---|---|
| POST | `/intelligence/research` | Research payment-related information |

**API note:** The endpoints above should be checked against the currently deployed backend routes and any global API prefix. In the examples below, the backend base URL uses `/api`.

---

## Database Design

SplitFlow uses PostgreSQL with Prisma ORM.

The core data model includes the following entities:

| Entity | Responsibility |
|---|---|
| Merchant | Represents a business using SplitFlow |
| Beneficiary | Represents a recipient of payment allocations |
| SplitRule | Defines a merchant's payment distribution configuration |
| SplitRuleItem | Stores individual beneficiary allocation instructions |
| Payment | Stores customer payment information |
| Distribution | Records the allocation associated with a payment |
| LedgerEntry | Records relevant financial operations |
| Payout | Stores supported payout or settlement tracking information |

### Entity Relationships

- A merchant can have multiple beneficiaries.
- A merchant can create multiple split rules.
- A split rule can contain multiple allocation items.
- A payment belongs to a merchant.
- A payment can reference a split rule.
- A payment can have multiple distribution records.
- Ledger entries provide an audit trail for relevant financial events.

---

## Getting Started

### Prerequisites

Make sure you have:

- Node.js 22 or later.
- npm.
- PostgreSQL.
- A Paystack account with the required API access.
- Bifrost configured for AI requests.
- Tavily API access for research functionality.

### 1. Clone the repositories

SplitFlow uses separate frontend and backend repositories.

**Backend**

```bash
git clone https://github.com/moa-mel/global-split-payment.git

cd global-split-payment
```

**Frontend**

```bash
git clone https://github.com/moa-mel/split-payment-frontend.git

cd split-payment-frontend
```

### 2. Install dependencies

Run in each repository:

```bash
npm install
```

### 3. Configure environment variables

Create the required `.env` file in the backend and configure the database, payment provider, and AI integrations.

For the frontend, configure the backend API URL.

### 4. Run database migrations

From the backend directory:

```bash
npx prisma generate
```

```bash
npx prisma migrate dev
```

### 5. Start the backend

```bash
npm run start:dev
```

### 6. Start the frontend

```bash
npm run dev
```

Open the frontend URL displayed by Next.js in your browser.

---

## Environment Configuration

### Backend

Create a `.env` file in the backend project.

Example configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

PAYSTACK_SECRET_KEY="your_paystack_secret_key"

BIFROST_BASE_URL="your_bifrost_base_url"
BIFROST_API_KEY="your_bifrost_api_key"

TAVILY_API_KEY="your_tavily_api_key"
```

The exact variable names must match the backend configuration and environment validation currently implemented in the repository.

Never commit real API keys or database credentials.

### Frontend

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

Replace the URL with the deployed backend address when using a hosted environment.

---

## Security and Reliability

SplitFlow is designed to keep financial operations under backend control.

Important security and reliability considerations include:

### Server-Side Payment Credentials

Paystack secret keys and AI provider credentials must remain on the backend.

They must never be exposed through frontend environment variables prefixed with `NEXT_PUBLIC_`.

### Payment Verification

A payment should only be marked successful after verification with Paystack or a trusted provider webhook.

### Idempotency

Payment initialization, verification, ledger writes, and webhook processing should use appropriate idempotency controls to avoid duplicate financial records.

### Allocation Validation

The backend validates split-rule configurations before initializing payments.

Percentage allocations must satisfy the configured total, and fixed allocations must comply with transaction constraints.

### Merchant Isolation

Merchant-scoped operations must ensure that a merchant can only access its own beneficiaries, split rules, payments, and related records.

### Auditability

Financial events should be recorded so that payment activity and allocation changes can be investigated.

### Settlement Accuracy

An internal allocation record is not proof of successful bank settlement. Reconciliation should use provider transaction and settlement information where available.

---

## Current Scope and Limitations

The platform is focused on merchant payment splitting, not group contributions or pooled payments.

Current architectural scope includes:

- Merchant accounts.
- Beneficiary and subaccount management.
- Configurable payment split rules.
- Paystack payment initialization.
- Payment verification.
- Allocation and ledger records.
- AI-assisted split-rule drafting.
- Payment-provider research.
- Settlement reconciliation workflows.

The exact availability of individual features depends on the deployed backend implementation and payment-provider configuration.

Paystack fees, settlement timelines, supported split configurations, and account requirements are subject to Paystack's policies.

---

## Future Improvements

Potential future development includes:

- Merchant onboarding and verification workflows.
- More advanced payment analytics.
- Automated settlement reconciliation using provider reports.
- Payment failure monitoring and notifications.
- Refund and reversal handling.
- Multiple payment-provider support.
- More advanced split-rule scheduling.
- Improved audit logs and reporting.
- Merchant-specific payment intelligence.
- Expanded webhook processing and recovery workflows.

---

## Contributing

Contributions are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Submit a pull request with a clear explanation of the change.

Please avoid committing credentials, secrets, or production payment data.

---

## License

Add the project's chosen license here before publishing or distributing the code.

---

## Project Summary

SplitFlow simplifies how businesses manage shared revenue from customer payments.

By combining configurable payment split rules, Paystack subaccount settlement, payment tracking, and AI-assisted workflows, SplitFlow helps businesses reduce manual payment distribution work and gain better visibility into their financial operations.

**SplitFlow — One payment. Multiple beneficiaries. Automated distribution.**