/**
 * Navigation utilities for CLI consistency
 */

import inquirer from 'inquirer';

export interface NavigationOption {
  name: string;
  value: string;
  description?: string;
}

export interface MenuConfig {
  title: string;
  subtitle?: string;
  choices: NavigationOption[];
  allowBack?: boolean;
  allowExit?: boolean;
}

/**
 * Create standardized menu choices with navigation
 */
export function createMenuChoices(config: MenuConfig): NavigationOption[] {
  const choices = [...config.choices];

  // Add separator before navigation options
  if (config.allowBack || config.allowExit) {
    choices.push({ name: '', value: 'separator', description: 'separator' });
  }

  // Add back option
  if (config.allowBack) {
    choices.push({ 
      name: '← Back', 
      value: 'back',
      description: 'Return to previous menu'
    });
  }

  // Add exit option
  if (config.allowExit) {
    choices.push({ 
      name: '🚪 Exit', 
      value: 'exit',
      description: 'Exit the application'
    });
  }

  return choices;
}

/**
 * Standard menu prompt with navigation
 */
export async function showMenu(config: MenuConfig): Promise<string> {
  const choices = createMenuChoices(config);
  
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: config.subtitle || 'Choose an option:',
      choices: choices
        .filter(c => c.description !== 'separator')
        .map(c => ({
          name: c.name,
          value: c.value
        })),
      pageSize: Math.min(choices.length, 12)
    }
  ]);

  return choice;
}

/**
 * Handle standard navigation actions
 */
export async function handleNavigation(
  action: string, 
  onBack?: () => Promise<void>, 
  onExit?: () => Promise<void>
): Promise<boolean> {
  switch (action) {
    case 'back':
      if (onBack) {
        await onBack();
      }
      return true; // Handled
    case 'exit':
      if (onExit) {
        await onExit();
      } else {
        process.exit(0);
      }
      return true; // Handled
    default:
      return false; // Not a navigation action
  }
}

/**
 * Confirmation prompt with consistent styling
 */
export async function confirm(
  message: string, 
  defaultValue: boolean = false
): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }
  ]);
  return confirmed;
}

/**
 * Input prompt with validation
 */
export async function input(
  message: string,
  options: {
    default?: string;
    mask?: string;
    validate?: (input: string) => boolean | string;
  } = {}
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: options.mask ? 'password' : 'input',
      name: 'value',
      message,
      default: options.default,
      mask: options.mask || undefined,
      validate: options.validate || ((input) => input.length > 0 || 'This field is required')
    }
  ]);
  return value;
}

/**
 * Multi-select prompt
 */
export async function multiSelect(
  message: string,
  choices: Array<{ name: string; value: string; checked?: boolean }>
): Promise<string[]> {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices
    }
  ]);
  return selected;
}

/**
 * Number input with validation
 */
export async function numberInput(
  message: string,
  options: {
    default?: number;
    min?: number;
    max?: number;
  } = {}
): Promise<number> {
  const { value } = await inquirer.prompt([
    {
      type: 'number',
      name: 'value',
      message,
      default: options.default,
      validate: (input) => {
        if (isNaN(input)) return 'Please enter a valid number';
        if (options.min !== undefined && input < options.min) return `Must be at least ${options.min}`;
        if (options.max !== undefined && input > options.max) return `Must be at most ${options.max}`;
        return true;
      }
    }
  ]);
  return value;
}

/**
 * Generic return to menu helper
 */
export async function returnToMenu(menuName: string = 'main menu'): Promise<boolean> {
  return await confirm(`Return to ${menuName}?`, true);
}