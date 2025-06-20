import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import boxen from 'boxen';
import { table } from 'table';

// Synaptic Lab color palette
const colors = {
  primary: '#00A99D',    // Aqua/Persian Green
  secondary: '#93278F',  // Dark Purple
  dark: '#33475B',       // Cello
  accent: '#F7931E',     // Carrot Orange
  info: '#29ABE2',       // Summer Sky
  light: '#FBF7F1',      // Floral White
};

// Custom chalk colors
const aqua = chalk.hex(colors.primary);
const purple = chalk.hex(colors.secondary);
const cello = chalk.hex(colors.dark);
const orange = chalk.hex(colors.accent);
const sky = chalk.hex(colors.info);
// Gradient theme using brand colors
const synapticGradient = gradient([colors.primary, colors.secondary, colors.info]);

// ASCII Art Logo
export function displayLogo(): void {
  const logo = figlet.textSync('Synaptic Lab', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
  });
  
  console.log('\n' + synapticGradient.multiline(logo));
  console.log(cello('  AI Testing Framework for the Modern Era\n'));
}

// Styled header
export function displayHeader(title: string, subtitle?: string): void {
  const content = subtitle ? `${aqua.bold(title)}\n${cello(subtitle)}` : aqua.bold(title);
  
  console.log(boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: colors.primary,
    float: 'center',
  }));
}

// Progress indicator
export function displayProgress(current: number, total: number, label: string): void {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 30);
  const empty = 30 - filled;
  
  const bar = aqua('█'.repeat(filled)) + cello('░'.repeat(empty));
  const progress = `${bar} ${purple.bold(`${percentage}%`)} ${cello(label)}`;
  
  process.stdout.write(`\r${progress}`);
}

// Status indicators
export const icons = {
  success: aqua('✓'),
  error: orange('✗'),
  warning: orange('⚠'),
  info: sky('ℹ'),
  rocket: '🚀',
  sparkles: '✨',
  fire: '🔥',
  robot: '🤖',
  brain: '🧠',
  test: '🧪',
  key: '🔑',
  lock: '🔒',
  shield: '🛡️',
};

// Styled table
export function displayTable(data: any[][], headers?: string[]): void {
  const config = {
    border: {
      topBody: cello('─'),
      topJoin: cello('┬'),
      topLeft: cello('┌'),
      topRight: cello('┐'),
      bottomBody: cello('─'),
      bottomJoin: cello('┴'),
      bottomLeft: cello('└'),
      bottomRight: cello('┘'),
      bodyLeft: cello('│'),
      bodyRight: cello('│'),
      bodyJoin: cello('│'),
      joinBody: cello('─'),
      joinLeft: cello('├'),
      joinRight: cello('┤'),
      joinJoin: cello('┼'),
    },
  };
  
  if (headers) {
    data.unshift(headers.map(h => purple.bold(h)));
  }
  
  console.log(table(data, config));
}

// Model status card
export function displayModelCard(provider: string, model: string, status: 'active' | 'available' | 'missing'): void {
  const statusColors = {
    active: aqua,
    available: orange,
    missing: cello,
  };
  
  const statusIcons = {
    active: icons.success,
    available: '○',
    missing: '-',
  };
  
  const color = statusColors[status];
  const icon = statusIcons[status];
  
  console.log(
    boxen(
      `${icon} ${purple.bold(provider.toUpperCase())}\n` +
      `${color(model || 'Default model')}\n` +
      cello(`Status: ${status}`),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: status === 'active' ? colors.primary : colors.dark,
        dimBorder: status === 'missing',
      }
    )
  );
}

// Animated spinner frames
export const spinnerFrames = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['―', '\\', '|', '/'],
  circle: ['◐', '◓', '◑', '◒'],
  braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
};

// Test result visualization
export function displayTestResult(name: string, passed: boolean, metrics: any): void {
  const icon = passed ? icons.success : icons.error;
  const color = passed ? aqua : orange;
  
  console.log(`\n${icon} ${purple.bold(name)}`);
  console.log(color(`   Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`));
  console.log(cello(`   Duration: ${metrics.duration}ms`));
  console.log(cello(`   Cost: $${metrics.cost?.toFixed(4) || '0.0000'}`));
}

// Command suggestion
export function displaySuggestion(command: string, description: string): void {
  console.log(
    `\n${icons.sparkles} ${sky('Try this:')} ` +
    aqua.bold(command) +
    cello(` - ${description}`)
  );
}

// Welcome message
export function displayWelcome(username?: string): void {
  displayLogo();
  
  const greeting = username 
    ? `Welcome back, ${purple.bold(username)}!`
    : 'Welcome to Synaptic Lab Kit!';
    
  console.log(boxen(
    `${greeting}\n\n` +
    `${icons.robot} ${cello('AI-powered testing at your fingertips')}\n` +
    `${icons.brain} ${cello('Generate, optimize, and validate with ease')}\n` +
    `${icons.test} ${cello('Build better AI applications faster')}`,
    {
      padding: 2,
      borderStyle: 'double',
      borderColor: colors.secondary,
      float: 'center',
    }
  ));
  
  console.log(cello('\nRun ') + aqua('/') + cello(' for quick reference or ') + aqua('synaptic-lab help') + cello(' for full guide\n'));
}

// API key status display
export function displayApiKeyStatus(providers: Record<string, boolean>): void {
  console.log(purple.bold('\n🔐 API Key Status:\n'));
  
  const data: any[][] = [];
  
  Object.entries(providers).forEach(([provider, hasKey]) => {
    const icon = hasKey ? icons.success : icons.lock;
    const status = hasKey ? aqua('Configured') : cello('Not configured');
    const action = hasKey ? '' : orange('Run: synaptic-lab auth add');
    
    data.push([
      `${icon} ${purple.bold(provider)}`,
      status,
      action,
    ]);
  });
  
  displayTable(data);
}

// Cost breakdown visualization
export function displayCostBreakdown(costs: Record<string, number>): void {
  const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  
  console.log(purple.bold('\n💰 Cost Breakdown:\n'));
  
  const data: any[][] = [];
  
  Object.entries(costs).forEach(([category, cost]) => {
    const percentage = ((cost / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((cost / total) * 20));
    
    data.push([
      sky(category),
      aqua(bar),
      orange(`$${cost.toFixed(4)}`),
      cello(`${percentage}%`),
    ]);
  });
  
  data.push([
    purple.bold('TOTAL'),
    '',
    orange.bold(`$${total.toFixed(4)}`),
    purple.bold('100%'),
  ]);
  
  displayTable(data);
}

// Interactive menu
export function displayMenu(title: string, options: Array<{value: string, label: string, description?: string}>): void {
  console.log(purple.bold(`\n${title}\n`));
  
  options.forEach((option, index) => {
    const num = aqua(`${index + 1}.`);
    const label = purple.bold(option.label);
    const desc = option.description ? cello(` - ${option.description}`) : '';
    
    console.log(`  ${num} ${label}${desc}`);
  });
  
  console.log('');
}