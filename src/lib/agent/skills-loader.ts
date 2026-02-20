import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export interface AgentSkill {
  name: string;
  description: string;
  instructions: string;
}

/**
 * Parses a SKILL.md file with YAML frontmatter.
 */
export async function parseSkillFile(
  filePath: string
): Promise<AgentSkill | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      console.warn(`No YAML frontmatter found in ${filePath}`);
      return null;
    }

    const yamlContent = match[1];
    const markdownContent = content.slice(match[0].length).trim();

    const metadata = yaml.load(yamlContent) as {
      name: string;
      description: string;
    };

    return {
      name: metadata.name,
      description: metadata.description,
      instructions: markdownContent,
    };
  } catch (error) {
    console.error(`Error parsing skill file ${filePath}:`, error);
    return null;
  }
}

/**
 * Loads all active skills from the skills directory.
 */
export async function loadActiveSkills(
  enabledSkillIds: string[]
): Promise<AgentSkill[]> {
  const skillsDir = path.join(process.cwd(), 'src', 'skills');
  const loadedSkills: AgentSkill[] = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && enabledSkillIds.includes(entry.name)) {
        const skillFilePath = path.join(skillsDir, entry.name, 'SKILL.md');
        const skill = await parseSkillFile(skillFilePath);
        if (skill) {
          loadedSkills.push(skill);
        }
      }
    }
  } catch (error) {
    console.error('Error loading skills directory:', error);
  }

  return loadedSkills;
}
