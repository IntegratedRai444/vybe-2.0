import { webSocketClient } from './websocket';
import { useGitStore } from '../store/gitSlice';

class GitWebSocketService {
  private static instance: GitWebSocketService;
  private channel: string = 'git';
  private unsubscribeCallbacks: (() => void)[] = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): GitWebSocketService {
    if (!GitWebSocketService.instance) {
      GitWebSocketService.instance = new GitWebSocketService();
    }
    return GitWebSocketService.instance;
  }

  private initialize() {
    this.subscribeToGitEvents();
  }

  private subscribeToGitEvents() {
    // Branch updates
    const branchUnsubscribe = webSocketClient.subscribe(
      `${this.channel}:branch`,
      (event) => {
        const { branch, branches } = event.data;
        useGitStore.getState().actions.setBranch(branch);
        useGitStore.getState().actions.setBranches(branches);
      }
    );

    // Status updates
    const statusUnsubscribe = webSocketClient.subscribe(
      `${this.channel}:status`,
      (event) => {
        const { status, staged, unstaged } = event.data;
        useGitStore.getState().actions.setStatus(status);
        useGitStore.getState().actions.setStagedFiles(staged);
        useGitStore.getState().actions.setUnstagedFiles(unstaged);
      }
    );

    // Commit history
    const commitsUnsubscribe = webSocketClient.subscribe(
      `${this.channel}:commits`,
      (event) => {
        const { commits, current } = event.data;
        useGitStore.getState().actions.setCommits(commits);
        useGitStore.getState().actions.setCurrentCommit(current);
      }
    );

    // Connection status
    const connectionUnsubscribe = webSocketClient.subscribe(
      'connection',
      (event) => {
        useGitStore.getState().actions.setConnected(event.status === 'connected');
      }
    );

    this.unsubscribeCallbacks.push(
      branchUnsubscribe,
      statusUnsubscribe,
      commitsUnsubscribe,
      connectionUnsubscribe
    );
  }

  public async initializeRepository(path: string) {
    try {
      useGitStore.getState().actions.setLoading(true);
      await webSocketClient.send({
        type: 'git:init',
        data: { path }
      });
    } catch (error) {
      useGitStore.getState().actions.setError('Failed to initialize repository');
      console.error('Git initialization error:', error);
    } finally {
      useGitStore.getState().actions.setLoading(false);
    }
  }

  public async stageFiles(paths: string[]) {
    try {
      useGitStore.getState().actions.setLoading(true);
      await webSocketClient.send({
        type: 'git:stage',
        data: { paths }
      });
    } catch (error) {
      useGitStore.getState().actions.setError('Failed to stage files');
      console.error('Stage files error:', error);
    } finally {
      useGitStore.getState().actions.setLoading(false);
    }
  }

  public async commit(message: string) {
    try {
      useGitStore.getState().actions.setLoading(true);
      await webSocketClient.send({
        type: 'git:commit',
        data: { message }
      });
    } catch (error) {
      useGitStore.getState().actions.setError('Failed to create commit');
      console.error('Commit error:', error);
    } finally {
      useGitStore.getState().actions.setLoading(false);
    }
  }

  public async push() {
    try {
      useGitStore.getState().actions.setLoading(true);
      await webSocketClient.send({
        type: 'git:push'
      });
    } catch (error) {
      useGitStore.getState().actions.setError('Failed to push changes');
      console.error('Push error:', error);
    } finally {
      useGitStore.getState().actions.setLoading(false);
    }
  }

  public cleanup() {
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    this.unsubscribeCallbacks = [];
  }
}

export const gitWebSocketService = GitWebSocketService.getInstance();
