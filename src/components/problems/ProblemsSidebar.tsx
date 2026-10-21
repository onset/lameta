import { css } from "@emotion/react";
import * as React from "react";
import { observer } from "mobx-react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { SeverityIcon } from "./SeverityIcon";
import { ProblemWording } from "./ProblemWording";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Project } from "../../model/Project/Project";
import { Session } from "../../model/Project/Session/Session";
import { Person } from "../../model/Project/Person/Person";
import { navigationState } from "../../navigation/NavigationState";
import userSettings from "../../other/UserSettings";
import { navigateTo, NavigationResult } from "../../navigation/navigate";
import { NavigationTarget } from "../../navigation/NavigationTarget";
import { ProjectIcon } from "../project/ProjectIcon";
import { SessionIcon } from "../session/SessionIcon";
import { PeopleIcon } from "../people/PeopleIcon";
import { lameta_dark_blue, lameta_dark_green } from "../../containers/theme";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { IFieldProblem } from "../../problems/fieldRules";
import {
  combineProblems,
  fromFieldProblem,
  fromRulesFileProblem,
  IProblem,
  withoutRulesFileDuplicates,
} from "../../problems/problems";
import { projectProblems } from "../../problems/ProjectProblems";
import { rulesFileProblems } from "../../problems/RulesFileProblems";
import { IRulesFileError, IRulesFileProblem } from "../../problems/rulesSandboxMain";

export const kProblemsSidebarWidth = 300;

// How many problems and warnings there are. It stays at the top right of the window
// and clicking it shows or hides the Problems sidebar. While the sidebar is open,
// a close button follows it; while it is closed, that button's place is kept empty,
// so that the indicator does not move.
export const ProblemsIndicator: React.FunctionComponent = observer(() => (
  <div
    css={css`
      display: flex;
      align-items: center;
      gap: 2px;
    `}
  >
    <ProblemsCountButton />
    <IconButton
      size="small"
      data-testid="hide-problems"
      title={t`Hide Problems`}
      aria-label={t`Hide Problems`}
      onClick={() => (userSettings.ShowProblems = false)}
      css={css`
        visibility: ${userSettings.ShowProblems ? "visible" : "hidden"};
      `}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  </div>
));

const ProblemsCountButton: React.FunctionComponent = observer(() => {
  const all = combineProblems(projectProblems.problems, rulesFileProblems.problems);
  const errors = all.filter((p) => p.severity === "error").length;
  const warnings = all.filter((p) => p.severity === "warning").length;
  return (
    <button
      data-testid="problems-indicator"
      title={userSettings.ShowProblems ? t`Hide Problems` : t`Show Problems`}
      onClick={() => (userSettings.ShowProblems = !userSettings.ShowProblems)}
      css={css`
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        font: inherit;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.9);
        background-color: transparent;
        border: solid 1px #ccc;
        border-radius: 4px;
        cursor: pointer;
        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        span,
        svg {
          margin: 0;
        }
        [data-testid^="severity-icon"] {
          font-size: 16px;
        }
      `}
    >
      <Trans>Problems</Trans>
      <span
        css={css`
          display: flex;
          align-items: center;
          gap: 2px;
        `}
      >
        <SeverityIcon severity="error" />
        {errors}
      </span>
      <span
        css={css`
          display: flex;
          align-items: center;
          gap: 2px;
        `}
      >
        <SeverityIcon severity="warning" />
        {warnings}
      </span>
    </button>
  );
});

interface IGroup {
  title: string;
  // for putting the groups in order: project, sessions, people, across sessions
  rank: number;
  // none for the selected session or person, which is listed so that the user can
  // see that it looks good
  problems: IProblem[];
  // the project, or the session or person that the group is about
  folderType?: NavigationTarget["folderType"];
  // from folderKeyOf(), so that the sidebar can find the group of the selected folder
  folderKey?: string;
}

function folderKeyOf(folderType: NavigationTarget["folderType"], folderId?: string): string {
  return folderType + ":" + (folderId ?? "");
}

interface ISelectedFolder {
  folderType: "session" | "person";
  folderId: string;
}

// The session or person that the user is looking at
function selectedFolder(project: Project): ISelectedFolder | undefined {
  if (navigationState.topTab === "sessions") {
    const session = project.sessions.items[project.sessions.selectedIndex] as Session | undefined;
    return session && { folderType: "session", folderId: session.id };
  }
  if (navigationState.topTab === "people") {
    const person = project.persons.items[project.persons.selectedIndex] as Person | undefined;
    return (
      person && {
        folderType: "person",
        folderId: person.getIdToUseForReferences(),
      }
    );
  }
  return undefined;
}

// the same icons as the Project, Sessions and People tabs, and darker versions of
// their colours that are readable as text on white
const kFolderTypeIcons = {
  project: <ProjectIcon />,
  session: <SessionIcon />,
  person: <PeopleIcon />,
};
const kFolderTypeColors = {
  project: "#B84000",
  session: "#4A7A10",
  person: lameta_dark_blue,
};

// Lists metadata problems beside the workspace. Clicking one takes the user to
// the place where they can fix it; the sidebar stays put.
export const ProblemsSidebar: React.FunctionComponent<{ project: Project }> = observer((props) => {
  const fieldProblems = projectProblems.problems;
  const rulesProblems = rulesFileProblems.problems;
  const selected = selectedFolder(props.project);
  const selectedKey = selected && folderKeyOf(selected.folderType, selected.folderId);
  const groups = groupProblems(props.project, fieldProblems, rulesProblems, selected);
  // a re-check makes new problem objects, so remember these by what they say
  const [selectedProblem, setSelectedProblem] = React.useState<string>();
  const [result, setResult] = React.useState<NavigationResult>();
  // the user may click another entry before navigateTo() finishes with this one
  const latestClick = React.useRef(0);
  // When the user selects a session or person, show its problems at the top.
  // Not when the selection comes from clicking a problem here, because that would
  // move the entry that the user just clicked.
  const scrollArea = React.useRef<HTMLDivElement>(null);
  const selectedByClick = React.useRef<string>();
  const selectedHasGroup = groups.some((g) => g.folderKey === selectedKey);
  React.useEffect(() => {
    const fromClick = selectedByClick.current === (selectedKey ?? "");
    selectedByClick.current = undefined;
    if (fromClick) return;
    // the user went to another folder, so the entry they clicked is behind them
    setSelectedProblem(undefined);
    if (!selectedKey || !selectedHasGroup) return;
    const area = scrollArea.current;
    const section = area?.querySelector(
      `[data-folder-key="${CSS.escape(selectedKey)}"]`,
    ) as HTMLElement | null;
    // the browser stops short of this when the group is near the end
    if (area && section) area.scrollTo({ top: section.offsetTop, behavior: "smooth" });
  }, [selectedKey, selectedHasGroup]);
  const all = groups.flatMap((g) => g.problems);

  return (
    <div
      data-testid="problems-sidebar"
      data-check-milliseconds={projectProblems.checkMilliseconds.toFixed(1)}
      data-rules-timing={JSON.stringify(rulesFileProblems.timing)}
      css={css`
        width: ${kProblemsSidebarWidth}px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        border-left: solid 1px #ccc;
        background-color: white;
        overflow: hidden;
      `}
    >
      {rulesFileProblems.errors.length > 0 && (
        <div
          css={css`
            padding: 6px 12px;
            border-bottom: solid 1px #ddd;
          `}
        >
          <RulesFileErrors errors={rulesFileProblems.errors} />
        </div>
      )}
      <div
        ref={scrollArea}
        css={css`
          padding-top: 4px;
          flex-grow: 1;
          overflow-y: auto;
          overflow-x: hidden;
          // so that a group's offsetTop is measured from here
          position: relative;
          // the other folders' sections are dimmed, except while the mouse is
          // in the list
          &:hover section {
            opacity: 1;
          }
        `}
      >
        {groups.map((group) => {
          const isCurrent = !!group.folderKey && group.folderKey === selectedKey;
          const color = group.folderType ? kFolderTypeColors[group.folderType] : "#999";
          // while a session or person is selected, the others' sections are dimmed
          const dimmed = !!selectedKey && !isCurrent;
          return (
            <section
              key={group.folderKey ?? group.title}
              data-testid="problem-group"
              data-folder-key={group.folderKey}
              data-current={isCurrent || undefined}
              css={css`
                padding: 6px 0 4px;
                ${dimmed ? "opacity: 0.45;" : ""}
              `}
            >
              {group.folderType ? (
                <h4
                  css={css`
                    margin: 4px 0 4px;
                    padding: 4px 12px 6px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    color: ${color};
                    // the folder's colour, faded
                    border-bottom: solid 2px ${color}40;
                    img {
                      height: 16px;
                    }
                  `}
                >
                  {kFolderTypeIcons[group.folderType]}
                  {group.title}
                </h4>
              ) : (
                <h4
                  css={css`
                    margin: 0;
                    padding: 10px 12px 4px;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: rgba(0, 0, 0, 0.6);
                  `}
                >
                  {group.title}
                </h4>
              )}
              <ul
                css={css`
                  list-style: none;
                  margin: 0;
                  padding: 0;
                `}
              >
                {group.problems.length === 0 && (
                  <li
                    data-testid="problems-looks-good"
                    css={css`
                      display: flex;
                      align-items: flex-start;
                      gap: 8px;
                      // like a problem's entry
                      padding: 6px 12px 6px 36px;
                      font-size: 13px;
                      line-height: 18px;
                      color: rgba(0, 0, 0, 0.87);
                      svg {
                        font-size: 16px;
                        margin-top: 1px;
                        color: ${lameta_dark_green};
                      }
                    `}
                  >
                    <CheckCircleIcon fontSize="inherit" />
                    <Trans>Looks good</Trans>
                  </li>
                )}
                {group.problems.map((problem) => {
                  const isSelected = selectedProblem === problem.key;
                  const content = (
                    <>
                      <SeverityIcon severity={problem.severity} fontSize="inherit" />
                      <div
                        css={css`
                          min-width: 0;
                          overflow-wrap: anywhere;
                        `}
                      >
                        <ProblemWording wording={problem} fileName={problem.target?.fileName} />
                        {isSelected && result && !result.found && (
                          <div
                            data-testid="problem-target-missing"
                            css={css`
                              font-size: 0.8em;
                              color: #c62828;
                            `}
                          >
                            {describeMissing(result)}
                          </div>
                        )}
                      </div>
                    </>
                  );
                  const rowStyle = css`
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    width: 100%;
                    text-align: left;
                    // the icon lines up with the name in the group heading
                    padding: 6px 12px 6px 36px;
                    border: none;
                    background-color: ${isSelected ? "#e8eef7" : "transparent"};
                    font: inherit;
                    font-size: 13px;
                    line-height: 18px;
                    color: rgba(0, 0, 0, 0.87);
                    // the icon's middle on the first line of text
                    & > [data-testid^="severity-icon"] {
                      font-size: 16px;
                      margin-top: 1px;
                    }
                  `;
                  return (
                    <li
                      key={problem.key}
                      css={css`
                        background-color: ${isSelected ? "#e8eef7" : "transparent"};
                      `}
                    >
                      {problem.target ? (
                        <button
                          data-testid="problem-entry"
                          data-check-id={problem.checkId}
                          data-field-key={problem.target.fieldKey}
                          onClick={async () => {
                            const click = ++latestClick.current;
                            setSelectedProblem(problem.key);
                            // "" for the Project tab, where no session
                            // or person is selected
                            const clickedKey =
                              problem.target!.folderType === "project"
                                ? ""
                                : folderKeyOf(problem.target!.folderType, problem.target!.folderId);
                            selectedByClick.current =
                              clickedKey !== (selectedKey ?? "") ? clickedKey : undefined;
                            setResult(undefined);
                            const target = problem.target!;
                            // the problem may be fixed already, before the
                            // next check removes its entry
                            const keepHighlightWhile = hasProblemAt(target)
                              ? () => hasProblemAt(target)
                              : undefined;
                            const r = await navigateTo(props.project, target, keepHighlightWhile);
                            if (click === latestClick.current) setResult(r);
                          }}
                          css={css`
                            ${rowStyle};
                            cursor: pointer;
                            &:hover {
                              background-color: #f0f4fa;
                            }
                          `}
                        >
                          {content}
                        </button>
                      ) : (
                        // lameta has nowhere to take the user, so this is not a link
                        <div
                          data-testid="problem-entry"
                          data-check-id={problem.checkId}
                          css={rowStyle}
                        >
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {all.length === 0 && !rulesFileProblems.running && (
          <div
            css={css`
              padding: 12px;
              color: rgba(0, 0, 0, 0.6);
            `}
          >
            <Trans>No problems found.</Trans>
          </div>
        )}
      </div>
      {rulesFileProblems.running && (
        <div
          css={css`
            padding: 6px 12px;
            border-top: solid 1px #ddd;
            font-size: 12px;
            color: rgba(0, 0, 0, 0.6);
          `}
        >
          <Trans>Checking…</Trans>
        </div>
      )}
    </div>
  );
});

// Problems in the rules file itself, which the user has to know about rather than
// wonder why nothing is reported
const RulesFileErrors: React.FunctionComponent<{
  errors: IRulesFileError[];
}> = (props) =>
  props.errors.length === 0 ? null : (
    <div
      data-testid="rules-file-errors"
      css={css`
        margin-top: 6px;
        padding: 6px 8px;
        border-radius: 4px;
        background-color: #fdecea;
        color: #8a1c1c;
        font-size: 12px;
      `}
    >
      {props.errors.map((e, i) => (
        <div key={i}>
          {e.check && <strong>{e.check}</strong>}
          {e.check && e.sessionId && " "}
          {e.sessionId && <span>({e.sessionId})</span>}
          {e.check && ": "}
          {e.message}
        </div>
      ))}
    </div>
  );

// Whether the field rules or the rules file still report a problem at the target.
// Reads MobX observables, so a reaction re-runs it after each check.
function hasProblemAt(target: NavigationTarget): boolean {
  const same = (t?: NavigationTarget) =>
    !!t &&
    t.folderType === target.folderType &&
    t.fieldKey === target.fieldKey &&
    t.fileName === target.fileName &&
    (t.folderType === "project"
      ? target.folderType === "project" && t.documents === target.documents
      : target.folderType !== "project" && t.folderId === target.folderId);
  return (
    projectProblems.problems.some((p) => same(p.target)) ||
    rulesFileProblems.problems.some((p) => same(p.target))
  );
}

// The project, then each session and each person in the project's order, then the
// problems that the rules file found across sessions
function groupProblems(
  project: Project,
  fieldProblems: IFieldProblem[],
  rulesProblems: IRulesFileProblem[],
  // listed even when it has no problems
  selected?: ISelectedFolder,
): IGroup[] {
  const sessionIds = (project.sessions.items as Session[]).map((s) => s.id);
  const personIds = project.persons.items.map((p) => p.displayName);
  const groups = new Map<string, IGroup>();
  const add = (
    title: string,
    rank: number,
    problem: IProblem | undefined,
    folderType?: IGroup["folderType"],
    folderId?: string,
  ) => {
    // not by title: if the translation catalog lacks the title, every session's
    // title would be the same "Session {0}"
    const folderKey = folderType && folderKeyOf(folderType, folderId);
    const key = folderKey ?? title;
    if (!groups.has(key)) groups.set(key, { title, rank, problems: [], folderType, folderKey });
    if (problem) groups.get(key)!.problems.push(problem);
  };
  const addAtTarget = (target: NavigationTarget, problem: IProblem | undefined) => {
    if (target.folderType === "project") add(t`Project`, 0, problem, "project");
    else if (target.folderType === "session")
      add(
        t`Session ${target.folderId}`,
        1 + indexOrEnd(sessionIds, target.folderId),
        problem,
        "session",
        target.folderId,
      );
    else
      add(
        t`Person ${target.folderId}`,
        1_000_000 + indexOrEnd(personIds, target.folderId),
        problem,
        "person",
        target.folderId,
      );
  };
  for (const p of withoutRulesFileDuplicates(fieldProblems, rulesProblems))
    addAtTarget(p.target, fromFieldProblem(p));
  for (const p of rulesProblems) {
    const problem = fromRulesFileProblem(p);
    if (p.from === "checkAcrossSessions") add(t`Across sessions`, 2_000_000, problem);
    else if (p.target) addAtTarget(p.target, problem);
    else if (p.from === "checkCorpus") add(t`Project`, 0, problem, "project");
    else
      add(
        t`Session ${p.sessionId ?? ""}`,
        1 + indexOrEnd(sessionIds, p.sessionId ?? ""),
        problem,
        "session",
        p.sessionId,
      );
  }
  if (selected) addAtTarget(selected, undefined);
  return Array.from(groups.values()).sort((a, b) => a.rank - b.rank);
}

function indexOrEnd(list: string[], item: string): number {
  const i = list.indexOf(item);
  return i < 0 ? list.length : i;
}

function describeMissing(result: NavigationResult): React.ReactNode {
  if (result.found) return null;
  switch (result.missing) {
    case "folder":
      return <Trans>This no longer exists.</Trans>;
    case "file":
      return <Trans>This file no longer exists.</Trans>;
    case "field":
      return <Trans>This field no longer exists.</Trans>;
    case "tab":
      // a programming error: kProjectTabOfForm or kSessionTabOfForm lacks this form
      return `No tab shows fields of form "${result.form}".`;
  }
}
