/**
 * Logger utilities for infrastructure scripts
 */
import chalk from "chalk";

/**
 * Logger utility with colored output
 */
export class Logger {
  static info(message: string): void {
    console.log(chalk.blue("[INFO]"), message);
  }

  static success(message: string): void {
    console.log(chalk.green("[SUCCESS]"), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow("[WARNING]"), message);
  }

  static error(message: string): void {
    console.log(chalk.red("[ERROR]"), message);
  }

  static status(message: string): void {
    console.log(chalk.cyan("🔍"), message);
  }

  static rocket(message: string): void {
    console.log(chalk.magenta("🚀"), message);
  }
}
