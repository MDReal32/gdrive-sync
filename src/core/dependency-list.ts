type Task = () => Promise<void>;

export class DependentList {
  private readonly tasks: Map<string, Task>;
  private readonly dependencies: Map<string, string[]>;
  private readonly dependants: Map<string, string[]>;

  constructor() {
    this.tasks = new Map();
    this.dependencies = new Map();
    this.dependants = new Map();
  }

  addTask(name: string, task: Task, dependencies: string[] = []) {
    this.tasks.set(name, task);
    this.dependants.set(name, this.dependants.get(name) || []);
    this.dependencies.set(name, dependencies);

    dependencies.forEach(dep => {
      const dependants = this.dependants.get(dep) || [];
      dependants.push(name);
      this.dependants.set(dep, dependants);
    });
  }

  async run(parallel: number) {
    const tasks = new Set<string>();
    const runningTasks = new Set<string>();
    const completedTasks = new Set<string>();

    this.tasks.forEach((_task, name) => {
      if (!this.dependencies.get(name).length) {
        tasks.add(name);
      }
    });

    const taskGenerator = tasks.values();
    const nextTask = async () => {
      const task = taskGenerator.next().value;
      const taskDependencies = this.dependencies.get(task);

      if (!taskDependencies) {
        return;
      }

      if (taskDependencies.some(dep => !completedTasks.has(dep))) {
        tasks.add(task);
        return;
      }

      tasks.delete(task);
      runningTasks.add(task);
      const taskFn = this.tasks.get(task);
      await taskFn();
      completedTasks.add(task);
      runningTasks.delete(task);

      const dependants = this.dependants.get(task);
      dependants.forEach(dep => {
        if (!runningTasks.has(dep)) {
          tasks.add(dep);
        }
      });

      await nextTask();
    };

    await Promise.all(Array.from({ length: parallel }).map(nextTask));
  }
}
