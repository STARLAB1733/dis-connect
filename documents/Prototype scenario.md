## **Phase A**

Scores start at 50

# Narrative Setup \- Part 1 

Your team has been assigned to build a **Training Tracking System** for a large multinational company.

* HR needs visibility across countries.  
* Managers want quick insights into team training.  
* The deadline for a demo is tight.

The team must decide how to start building the system.

## Software Engineer 

HR asks for dashboards quickly, but requirements are still unclear.

What approach do you take?

1. **“Start with a simple MVP dashboard.”** Ship fast, refine later.  
2. **“Design a flexible system architecture first.”** Slower start, easier expansion later.  
3. **“Focus heavily on UX so managers love using it.”** Polished interface before features.  
4. **“Add as many features as possible from the start.”** Try to satisfy everyone early.

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| MVP dashboard | \+5 | \+8 | \-3 | 0 | 0 | 0 |
| Flexible system | \+2 | \-4 | \+6 | \-2 | 0 | \+2 |
| UX focus | \+9 | \-3 | 0 | \-2 | 0 | 0 |
| Feature heavy | \+3 | \-6 | \-4 | \-3 | \+2 | \-1 |

## Cloud Platform Engineer 

The system must support multiple countries, but budget concerns are raised.

How do you design infrastructure?

1. “Use managed cloud services for reliability.”  
2. “Optimise for lowest cost first.”  
3. “Build scalable infrastructure from day one.”  
4. “Start small and upgrade later.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Managed services | 0 | \+2 | \+8 | \-6 | 0 | \+4 |
| Lowest cost | 0 | \+3 | \-5 | \+9 | 0 | \-2 |
| Scale-first | 0 | \-2 | \+7 | \-4 | 0 | \+3 |
| Start small | 0 | \+6 | \-3 | \+4 | 0 | 0 |

## DSAI Engineer 

Leadership wants strong reporting insights, but collecting more data raises concerns.

What is your strategy?

1. “Collect only essential data first.”  
2. “Capture lots of data for future insights.”  
3. “Focus on real-time dashboards early.”  
4. “Prioritise privacy-safe analytics.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Essential data | \+2 | \+5 | 0 | \+4 | \-5 | \+6 |
| Data-heavy | 0 | \-3 | \-2 | \-4 | \+10 | \-3 |
| Real-time dashboards | \+4 | \-2 | \-3 | \-3 | \+7 | 0 |
| Privacy-first | \+1 | \-3 | \+2 | \-2 | \+4 | \+9 |

# 

# Narrative Setup \- Part 2 

After kickoff, leadership wants a demo quickly.  
HR requests detailed reporting.  
Managers want a simple overview.  
Regional teams warn that network conditions vary across countries.

Your team must decide how to move forward with the MVP.

## Software Engineer 

Stakeholders want more features, but the demo deadline is close.

What do you prioritise?

1. “Deliver core features only — keep it stable.”  
2. “Add advanced filtering and reporting tools.”  
3. “Focus on making the interface extremely simple.”  
4. “Prototype many features quickly, refine later.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Core only | \+3 | \+9 | \+4 | 0 | \-2 | 0 |
| Advanced tools | \+4 | \-4 | \-3 | \-3 | \+7 | 0 |
| Simple interface | \+10 | \-3 | \+1 | 0 | \-2 | 0 |
| Fast prototyping | \+5 | \+8 | \-6 | \-2 | \+2 | \-1 |

## Cloud Platform Engineer 

Usage forecasts are unclear, but multiple regions may access the system simultaneously.

How do you handle infrastructure?

1. “Use regional load balancing for stability.”  
2. “Deploy in one main region to save cost.”  
3. “Enable auto-scaling aggressively.”  
4. “Limit scaling until real traffic appears.”  
   

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Regional LB | 0 | \-2 | \+10 | \-5 | 0 | \+3 |
| Single region | 0 | \+4 | \-7 | \+10 | 0 | \-2 |
| Aggressive scaling | 0 | \+3 | \+8 | \-8 | 0 | \+2 |
| Limited scaling | 0 | \+7 | \-5 | \+5 | 0 | 0 |

## DSAI Engineer 

HR asks for predictive insights on training trends, but the dataset is incomplete.

What do you do?

1. “Launch basic analytics first.”  
2. “Invest in building a strong data pipeline.”  
3. “Create visually impressive dashboards early.”  
4. “Wait until more data is collected.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Basic analytics | \+3 | \+8 | 0 | \+2 | \+4 | \+1 |
| Strong pipeline | \+2 | \-5 | \+4 | \-3 | \+10 | \+2 |
| Fancy dashboards | \+6 | \-3 | \-2 | \-2 | \+6 | 0 |
| Wait for data | 0 | \-6 | \+3 | \+4 | \-5 | \+4 |

# 

# 

# 

# Narrative Setup \- Part 3 

The MVP demo succeeded.

Leadership wants to roll the Training Tracking System out across multiple countries.

Regional teams report:

* Different data policies  
* Network instability in some regions  
* Increasing pressure from auditors

## Software Engineer 

Managers in different countries want customised dashboards.

What do you prioritise?

1. “Allow heavy customisation per region.”  
2. “Create one standardised global interface.”  
3. “Introduce modular UI components.”  
4. “Focus only on performance improvements.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Heavy customisation | \+10 | \-4 | \-3 | \-5 | \+2 | \-1 |
| Standardised UI | \+3 | \+5 | \+4 | \+4 | 0 | \+2 |
| Modular UI | \+6 | \-2 | \+5 | \-2 | \+1 | \+2 |
| Performance focus | \+2 | \+4 | \+8 | \+1 | \-2 | 0 |

## Cloud Platform Engineer 

Traffic spikes appear from new regions, but infrastructure costs are rising fast.

How do you handle infrastructure?

1. “Allow heavy customisation per region.”  
2. “Create one standardised global interface.”  
3. “Introduce modular UI components.”  
4. “Focus only on performance improvements.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Multi-region | 0 | \-3 | \+10 | \-7 | 0 | \+4 |
| Cost optimisation | 0 | \+3 | \-6 | \+10 | 0 | \-2 |
| Caching/performance | \+2 | \+4 | \+7 | \+2 | 0 | 0 |
| Limit expansion | \-3 | \-5 | \+6 | \+5 | \-1 | \+3 |

## DSAI Engineer 

Leadership wants predictive training insights across regions.

What do you do?

1. “Build cross-region analytics models.”  
2. “Focus on clean regional datasets first.”  
3. “Deliver simple visual summaries.”  
4. “Strengthen privacy-safe aggregation.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Cross-region models | \+2 | \-4 | \-2 | \-5 | \+11 | \-3 |
| Clean datasets | \+1 | \-2 | \+4 | \-1 | \+8 | \+3 |
| Visual summaries | \+7 | \+5 | 0 | \-1 | \+4 | 0 |
| Privacy aggregation | \+2 | \-3 | \+2 | \-2 | \+5 | \+10 |

# 

# 

# Narrative Setup \- Part 4 

After expansion across regions:

* HR prepares for full company-wide rollout  
* Managers are actively using the dashboards  
* Auditors begin reviewing system integrity  
* Leadership asks:  
   *“Are we ready to fully launch?”*

Your team must decide final priorities before release.

## Software Engineer 

Users request last-minute improvements before launch.

What do you prioritise?

1. “Polish UX and simplify workflows.”  
2. “Add missing advanced features.”  
3. “Stabilise performance and fix bugs.”  
4. “Release now and iterate after launch.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| UX polish | \+10 | \-3 | \+2 | \-1 | 0 | 0 |
| Advanced features | \+4 | \-6 | \-3 | \-2 | \+6 | \-1 |
| Stabilise | \+2 | \-2 | \+10 | 0 | \-1 | \+2 |
| Release now | \+3 | \+9 | \-6 | \+2 | 0 | \-2 |

## Cloud Platform Engineer 

Traffic projections are high, but finance warns about rising costs.

How do you handle infrastructure?

1. “Scale infrastructure aggressively for launch.”  
2. “Optimise infrastructure to reduce cost.”  
3. “Prioritise monitoring and resilience tools.”  
4. “Limit scaling until real usage appears.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Aggressive scaling | 0 | \+3 | \+11 | \-8 | 0 | \+3 |
| Cost optimisation | 0 | \+5 | \-7 | \+11 | 0 | \-2 |
| Monitoring focus | \+2 | \+2 | \+9 | \-2 | 0 | \+6 |
| Limit scaling | \-2 | \+7 | \-5 | \+6 | 0 | 0 |

## DSAI Engineer 

Leadership wants impactful insights at launch.

What do you do?

1. “Deliver strong predictive insights.”  
2. “Ensure data accuracy and trust.”  
3. “Create engaging visual reports.”  
4. “Reduce data complexity for performance.”

| Choice | UX | Delivery | Reliability | Cost | Data | Security |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: |
| Predictive insights | \+2 | \-4 | \-3 | \-4 | \+12 | \-2 |
| Data accuracy | \+1 | \-3 | \+5 | \-1 | \+8 | \+6 |
| Visual reports | \+8 | \+4 | 0 | \-1 | \+5 | 0 |
| Reduce complexity | \+2 | \+6 | \+4 | \+5 | \-6 | \+4 |

## 

## 

## 

## Project Outcome Logic

| Conditions | Result | Message |
| ----- | ----- | ----- |
| Reliability \< 35 | Rocky Launch | System struggles under pressure but shows potential. |
| CostEfficiency \< 35 | Costly Success | Powerful system, but finance is concerned. |
| UX \> 75 AND DeliverySpeed \> 65 | Popular Rollout | Managers love using it across regions. |
| SecurityTrust \< 35 | Compliance Warning | Auditors raise concerns after launch. |
| None | Success | You made the deadline\! |

## 

## Team Archetype Logic

Instead of hidden maths, we derive identity from highest meters.

| Dominant Meters | Archetype | Message |
| ----- | ----- | ----- |
| UX \+ Delivery | ⚡ The Speed Builders | Your team believes momentum creates opportunity. You prioritised fast delivery and visible progress, helping stakeholders see results quickly. In real projects, teams like yours drive innovation — but must stay mindful of long-term stability as systems grow. |
| Reliability \+ Security | 🛡 The Stabilizers | Your team built with reliability and trust at the core. By focusing on resilience and strong foundations, you ensured the system could scale safely across regions. Engineering teams like yours become the backbone of mission-critical platforms. |
| Data \+ UX | 📊 The Insight Creators | Your team unlocked the power of data. By investing in analytics and meaningful insights, you transformed information into decision-making tools for leaders. Teams like yours shape the future by turning data into impact. |
| Cost \+ Delivery | 💼 The Pragmatists | Your team made careful, practical decisions to balance cost, delivery, and outcomes. You focused on what works within real-world constraints — a mindset that keeps large systems sustainable. Many successful engineering teams thrive by thinking the way you do. |
| Balanced scores | 🌐 The All-Round Engineers | Your team balanced speed, stability, and innovation. Rather than specialising too heavily in one area, you adapted to changing needs and built a well-rounded solution. Teams like yours often bridge gaps and keep complex projects moving forward. |

