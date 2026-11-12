# FITI: Making combined exercises easier to follow

Draft for an English portfolio case study. Structure follows Clara: challenge, objective, role, insight, decisions, constraints, and outcome. This is a narrative draft, not a published page.

## Introduction

**FITI / Mobile product design / 2026**

**Making combined exercises easier to follow.**

A workout list can tell you which exercises to do without making it clear how to perform them together. I led an improvement to FITI's mobile exercise list to make trainer-assigned combinations easier to recognize, understand, and navigate.

Visual: final expanded group alongside its collapsed state. Use individual screen exports rather than the entire handoff board.

## The challenge

FITI already identified combined exercises with a label and exercise count. However, interviews and discovery showed that these cues were insufficient: users did not consistently interpret the exercise headers as the beginning of distinct movements within the group. The information existed, but its visual organization did not communicate the routine's structure clearly enough to guide execution.

Users still had to interpret which movements belonged together, where to find each demonstration, and when to move between exercises or rest.

The underlying assumption was that someone would finish all sets of one exercise before moving to the next. The behavior we observed did not always follow that sequence: people alternated movements within a combined routine.

Visual: previous expanded card, with annotations distinguishing the existing group label from the exercise headers that interviews revealed were not being understood as separate movements. Also identify the shared rest timing and separation between exercise names and their execution details.

## The objective

Make the trainer's intended routine easier to follow from the exercise list: identify the group, understand its sequence and rest timing, and access a demonstration for each movement.

A better workout experience was also intended to support engagement. Increased engagement or retention is a business hypothesis until supported by post-release evidence.

## My role

As the main designer for FITI's mobile app, I led the design decisions for this improvement, from research and design critiques through prototyping and developer handoff.

I worked closely with my product manager to understand gym members' needs and shape a solution for following trainer-assigned routines within the existing exercise list.

## A list of exercises is not the same as a workout sequence

Interviews and discovery revealed a gap between the information the interface displayed and what users understood. Labeling the routine as combined did not explain how to follow it, and the exercise headers were not enough to establish where one movement ended and another began.

For a combined routine, the relationship between movements matters as much as the movements themselves. Users need to recognize each constituent exercise, understand what belongs together, know what comes next, and see where the rest interval fits.

That shifted the design focus from identifying combined exercises to explaining how to follow them.

Visual: a simple sequence diagram using the final example: movement A, movement B, movement C, then the prescribed rest. Label it as this example's prescription, not a universal rule for combined training.

## Three decisions that made the routine clearer

### Move from a group label to a readable structure

The final design retains the combined-exercise label and count as an overview, but no longer relies on them alone to explain the routine. Inside the expanded group, each movement has a distinct visual container that brings its name and execution details together. The intent was to make the boundaries between exercises clearer while preserving their relationship as one combined routine.

Visual: previous exercise headers beside the final individual movement containers. Annotate the structural change rather than presenting the existing label and count as new features.

### Give each movement its own entry point

Inside the expanded group, every exercise has its own thumbnail, name, repetitions, and load. The board links individual exercises to their specific demonstration screens, making the intended destination explicit rather than relying on a single group-level media entry point.

Visual: expanded group with two annotated thumbnail-to-demonstration connections. Verify prototype behavior before describing exact tap targets.

### Explain sequence and rest where they are needed

The expanded card states that the exercises should be performed in sequence and places the rest instruction after the group. In the three-exercise example, the label explicitly identifies the rest as occurring after all three movements.

The design makes the intended sequence more explicit without requiring users to infer it from a shared interval field or a general observation.

Visual: previous shared interval field versus the final sequence instruction and group-specific rest label.

## Challenges and compromises

This was an improvement to an existing list, not a complete redesign of workout execution. The final screen still presents considerable information within an expanded card, and the set-completion control remains at group level.

Long exercise names and longer method labels also needed to fit without obscuring the exercise details. The final board includes a wrapping-label variant to address this content variation.

Further validation should examine whether people understand what completing a group set means and how the experience handles combinations with different prescribed sequences or rest rules.

## From research to alignment

Research and design critiques shaped the direction. Close collaboration with my product manager kept decisions grounded in how gym members follow their routines.

A Figma prototype brought the interactions into design checkpoints, giving the team a shared basis for feedback and approval before handoff.

## Ready for implementation

The work extended beyond the screens: updated components and a revised master file kept the new patterns part of FITI's shared design source.

Figma annotations documented interaction behavior for developer handoff, with the prototype providing context for how the screens worked together.

## Outcome

The final design responds directly to the discovery finding: an existing label was not enough to communicate the routine. It gives each movement a more distinct structure, associates guidance with the relevant exercise, and states the prescribed sequence and rest timing in context.

The demonstrated outcome is a clearer representation of combined routines. Release status, task-success improvements, and engagement impact still need confirmation before this section can describe production results.

## Evidence needed before publication

- Confirm release status and date.
- Confirm the previous frame's status: original production or intermediate iteration.
- Add any available detail about the interviews and discovery: participant context, examples of misunderstanding, and how alternating exercise behavior was identified.
- Distinguish retained group labels and counts from the new movement structure and execution guidance.
- Confirm exact media tap targets and set-completion behavior.
- Add available testing findings, user feedback, or post-release data without inventing metrics.

## Research context for the writer

These references were consulted while drafting this portfolio narrative. They are not evidence that competitive research occurred during the original FITI project.

- Strong documents visual grouping and navigation alternating between the next set of the appropriate exercise: https://help.strongapp.io/article/98-supersets-and-circuits
- Hevy documents paired supersets, groups of three or more, and example sequences with rest after a group: https://help.hevyapp.com/hc/en-us/articles/34953606698903-Build-a-Workout-Program-Create-Organize-Routines

## Figma references

- Previous example: https://www.figma.com/design/4IKSLgrRq8fRZBVTzKw89Z/-FITI--MASTER?node-id=10247-21916
- Final board: https://www.figma.com/design/4IKSLgrRq8fRZBVTzKw89Z/-FITI--MASTER?node-id=10247-19543
