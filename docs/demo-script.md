# Demo script

A step-by-step walkthrough for a project review, about 25 minutes. It follows the real flows first
(student, then admin), then the screens that are built but have no backend yet, and says so each
time.

## Before you start

```sh
docker compose up -d --build        # postgres, mailpit, api, ai-service
cd apps/web && pnpm dev             # http://localhost:5173
node scripts/create-demo-users      # prints a sign-in for each role (run once)
```

Open three tabs: the app (http://localhost:5173), Mailpit (http://localhost:8025), and the API
documentation (http://localhost:8080/swagger-ui.html) if you want to show the endpoints.

Every screen except the real features starts empty. That is deliberate: **no sample data exists
anywhere in the app**, so what you see is what a new college would see on day one.

Use a fresh browser profile or a private window for each role so sessions do not mix.

---

## 1. A student registers (real)

1. Go to **/register**. Enter a name, a college email, a roll number such as `22CS101`, choose a
   department, a graduation year and a password (8 or more characters, a letter and a number).
2. You land on the sign-in page with a confirmation. Sign in. A student lands on **/s**.

Point out: the overview shows dashes and empty states, not zeros. The "Profile completeness" panel
is real: it ticks off what the student has actually done.

## 2. Career interests (real)

1. Open **Career interests** in the sidebar (**/s/career**).
2. Choose **Mark as interest** on *Backend Developer* and *DevOps Engineer*. Open a role to see the
   skills it needs, grouped as core, important and bonus.
3. Go back to **Overview**: profile completeness has gone up.

Point out: interests are saved on the server. They pre-select the target roles in the next step.

## 3. Run the resume analyzer (real)

1. Open **Resume analyzer** (**/s/resume**). Both roles are already chosen, with the note
   "Pre-selected from your career interests".
2. Paste this resume into the text box. The character counter says when it is long enough.

```text
RAHUL VERMA
rahul.verma@example.com | +91 98450 12345 | github.com/rahulverma | linkedin.com/in/rahul-verma

SUMMARY
Final-year Computer Science student interested in web development.

EDUCATION
B.Tech in Computer Science and Engineering, Example Institute of Technology (2021 - 2025)
CGPA: 8.45/10

TECHNICAL SKILLS
Languages: Java, JavaScript, Python, SQL
Web: HTML5, CSS3, React, Node.js, Express.js, REST APIs
Databases: MySQL, MongoDB
Tools: Git, GitHub, Postman, Docker
Core subjects: Data Structures and Algorithms, DBMS, Operating Systems, Computer Networks

PROJECTS
Campus Marketplace | React, Node.js, Express.js, MongoDB
- Built a buy-and-sell web app for 1,200 students with login, listings and chat.
- Designed REST APIs and tested them with Postman.
- Containerised the app using Docker and deployed on AWS EC2.

Expense Tracker | Java, MySQL
- Developed a desktop expense tracker using Java and MySQL with object oriented design.
- Wrote unit tests in JUnit covering 80% of the logic.

INTERNSHIP
Web Development Intern, Brightwave Labs (Jun 2024 - Aug 2024)
- Fixed 25 UI bugs in a React dashboard and improved page load time by 30%.
- Collaborated with a team of five using Git and Agile sprints.

ACHIEVEMENTS
- Solved 300+ problems on competitive programming platforms.
- Team lead for the college hackathon.
```

3. Choose **Analyze resume**.

## 4. Read the result: skills, evidence and the gap (real)

You should see 28 skills found. Walk through the page from the top:

- **Readiness by role.** Backend Developer is **47.1%** (24.5 of 52 points). DevOps Engineer is
  **19.2%**. Open the breakdown table: a core skill is worth 3 points, an important one 2, a bonus
  one 1, and a skill only *listed* counts half of one *applied* in a project. The score is never
  shown without this working.
- **What is missing.** Backend Developer misses one core skill, *Database Design*. DevOps misses
  *Bash*, *CI/CD*, *Cloud Computing* and *Linux*.
- **Suggestions.** Each says what to do and why, for example "Learn Database Design and show it in a
  project", and "Show Algorithms in a project or internship, not only in a list".
- **Skills with evidence.** Find *Docker*: marked **Applied**, with the words it came from
  highlighted ("Containerised the app using Docker and deployed on AWS EC2"). *SQL* is **Listed**:
  it only appears in the skills section, so it earns half the points. Every skill shows the
  sentence it came from; the analyzer cannot report a skill that is not written in the text.
- **Found in your resume.** Email, links, education and CGPA 8.45, and the sections it recognised.

Say plainly: this is fixed rules and word lists, not a language model. The same text always gives the
same result ([how it works](resume-analyzer.md)).

## 5. Correct a skill (real)

1. In the skills list, choose **Remove Docker**. It is marked "Removed, not saved" and an edit bar
   appears.
2. Choose **Save changes**. Backend Developer drops to **43.3%** and DevOps Engineer to **13.5%**,
   and the suggestions are rebuilt from the edited list.
3. Optional: **Add a skill** (search "Terraform"). Hand-added skills count as *Listed* and are
   labelled "Added by you", never mistaken for a finding.
4. **Reset to analyzer result** brings the original back. The history on **/s/resume** shows the
   analysis as *Edited*. Deleting an analysis asks first and removes the resume text with it.

## 6. The pre-test check and the test player (UI only)

There are no assessments yet, so use a placeholder id.

1. Open **/s/assessments/demo/start**. Show the rules, the list of **exactly what is monitored**, and
   the sentence "Alerts are for review, not proof". The consent box must be ticked.
2. **Check camera and microphone.** Allow access: a local preview appears with a sound indicator,
   and the page says nothing is recorded or sent. Then show the failure paths: block the camera in
   the browser's site settings and try again for the "blocked" message, or unplug it for "not found".
3. **Enter full screen.** The *Start assessment* button unlocks only when all three steps are done.
4. Start. With no questions published, the page says "This assessment has no questions yet".
5. To show the player itself, open **http://localhost:5173/dev/components** (development only) and
   find *Test player (sample)*. This is the one place sample content exists, and it is labelled as
   such. Show the timer, the question palette (answered, marked for review, not answered, each with
   an icon and a word), *Mark for review*, *Review and submit* with the confirmation that counts
   what is still open, the monitoring banner, and the full-screen warning shown below it.

Be clear that scoring and event logging are not built (see the status document).

## 7. Faculty (UI only)

Sign in with the faculty account the script printed. It lands on **/f**.

- **Students**, **Mentoring**: empty tables with working filters and an "Add note" form that
  validates and then says "Saving isn't available yet".
- **Question bank → New question** (**/f/questions/new**): choose each type. Submit empty to see the
  checks, such as "Mark exactly one correct option" for single-answer questions.
- **New assessment** (**/f/assessments/new**): sections you can reorder, the question picker,
  and four proctoring switches each with help text. *Preview* shows what a student will see.
  *Publish* validates, then says it cannot save yet.
- **Proctoring review**: the queue and the note "Alerts are signals for review, not proof of
  misconduct". Its layout with a timeline is in the catalogue sample.

## 8. T&P (UI only, with real parts)

Sign in with the T&P account. It lands on **/tp**.

- **Drives → New drive** (**/tp/drives/new**): the form checks every field. The **required skills**
  picker lists real skills from the API, and the departments come from the real department list.
  Add and reorder recruitment stages. The *source of criteria* field records where the rules came
  from.
- **Eligibility layout**: open **/dev/components** and find *Eligibility review (sample)*. Each
  criterion is **Met**, **Not met** or **Unknown**, and Unknown looks different on purpose (dashed
  outline, question mark): missing data is never treated as failure. *Why* expands the explanation.
- **Academic import** (**/tp/academic-import**): drop this CSV in. It is read in the browser and
  nothing is uploaded.

```csv
Reg No,CGPA,Active Backlogs,Passout Year,Name
21CS001,8.4,0,2027,Asha
21CS002,7.1,1,2027,Ravi
21CS003,11.2,0,2027,Meera
21CS001,6.5,0,2027,Duplicate row
??,7,0,2027,Bad roll
21EC010,8,x,2027,Kiran
21IT011,9,0,2027,Leela
```

  The columns are matched automatically. The report shows **7** rows, **3** valid, **4** with
  errors (a CGPA over 10, a repeated roll number, a bad roll number, backlogs that are not a number)
  and **1** with an invalid format. Change a column mapping to watch the report recompute. Matching to
  registered students happens at import, which is not built yet.
- **Analytics**: the gap heatmap and trend, shown as empty states. Their layout is in the catalogue
  sample.

## 9. Administrator (real)

Sign in with the administrator from `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). It lands on **/admin**.

1. **Overview** shows real counts: users by role, active and inactive, and invites pending.
2. **Users → Create user.** Name, email, role *Faculty*, a department. There is no password field.
   Create it.
3. The new row shows **Invite pending**. Open **Mailpit** (http://localhost:8025): the email with the
   set-password link is there. Neither you nor the administrator ever sees a password.
4. Try **Resend invite**: a new email arrives and the old link stops working.
5. Open the link in a private window. Choose a password. Sign in: the faculty member lands on **/f**.
   The row in the admin list now shows **Active** and a last sign-in time.
6. **Deactivate** that account. The dialog says they are signed out everywhere. Back in the faculty
   window, reload: the session has ended, and signing in says the account is deactivated.
7. Show that an administrator's own row cannot be deactivated.
8. **Roles and permissions**: the matrix is built from the rules the API actually enforces (it is
   read only, and says editing is not available yet). Point at *Manage accounts*: only Admin is on.

## 10. Recruiter and notifications (UI only)

Sign in with the recruiter. **/r** shows assigned drives (none yet). The approved-candidates page
states that only profiles the placement team approved, and whose owners agreed to share them, can
appear. The bell in the top bar opens **/notifications**, with All and Unread tabs.

## What to say about scope

- Real: accounts and security, the resume analyzer with editing, career interests, the role and
  skill catalogue, and administration of accounts.
- UI only: every other screen, complete and validated, honest about having no backend.
- Not built: scoring, proctoring events, academic records, drives, exports, resume file upload.

The full list is in [milestone-1-status.md](milestone-1-status.md).
