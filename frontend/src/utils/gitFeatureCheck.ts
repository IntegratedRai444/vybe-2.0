import { getGitStatus, stageFiles } from "./gitUtils";

export interface GitFeatureStatus {
  name: string;
  description: string;
  isAvailable: boolean;
  testFunction?: () => Promise<boolean>;
  error?: string;
}

export const checkGitFeatures = async (): Promise<GitFeatureStatus[]> => {
  const features: GitFeatureStatus[] = [
    {
      name: "Git Status",
      description: "Check repository status",
      isAvailable: false,
      async testFunction() {
        try {
          await getGitStatus();
          return true;
        } catch (error) {
          this.error = error instanceof Error ? error.message : String(error);
          return false;
        }
      },
    },
    {
      name: "Stage Files",
      description: "Stage modified/untracked files",
      isAvailable: false,
      async testFunction() {
        try {
          // Test with an empty array to check if function exists
          await stageFiles([]);
          return true;
        } catch (error) {
          this.error = error instanceof Error ? error.message : String(error);
          return false;
        }
      },
    },
    {
      name: "Commit Changes",
      description: "Create commits",
      isAvailable: false,
      error: "Not implemented",
    },
    {
      name: "Branch Operations",
      description: "Create, switch, delete branches",
      isAvailable: false,
      error: "Not implemented",
    },
    {
      name: "Remote Operations",
      description: "Push, pull, fetch from remote",
      isAvailable: false,
      error: "Not implemented",
    },
    {
      name: "View History",
      description: "View commit history",
      isAvailable: false,
      error: "Not fully implemented",
    },
    {
      name: "Diff View",
      description: "View changes in files",
      isAvailable: false,
      error: "Not implemented",
    },
  ];

  // Test each feature that has a test function
  for (const feature of features) {
    if (feature.testFunction) {
      try {
        feature.isAvailable = await feature.testFunction();
      } catch (error) {
        feature.isAvailable = false;
        feature.error = error instanceof Error ? error.message : String(error);
      }
    }
  }

  return features;
};

export const getGitImplementationStatus = (features: GitFeatureStatus[]) => {
  const totalFeatures = features.length;
  const availableFeatures = features.filter((f) => f.isAvailable).length;
  const percentage = Math.round((availableFeatures / totalFeatures) * 100);

  return {
    totalFeatures,
    availableFeatures,
    percentage,
    status: percentage === 100 ? "Complete" : "Partial",
    hasCriticalFeatures: features.some(
      (f) =>
        ["Git Status", "Stage Files", "Commit Changes"].includes(f.name) &&
        !f.isAvailable,
    ),
  };
};
