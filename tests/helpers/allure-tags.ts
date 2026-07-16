import type { TestInfo } from '@playwright/test';
import * as allure from 'allure-js-commons';

// Tags every test with Allure's epic/feature/story labels so the Behaviors
// view groups tests as Sidebar Section > Subsection > Test Case. featureMap
// matches the test title's prefix (case-insensitive, longest match wins) to
// a feature name; an empty-string prefix acts as a catch-all for flat files
// with a single subsection.
export async function tagAllure(
  testInfo: TestInfo,
  epicName: string,
  featureMap: [string, string][],
) {
  await allure.epic(epicName);

  const title = testInfo.title.toLowerCase();
  const match = [...featureMap]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => title.startsWith(prefix.toLowerCase()));
  await allure.feature(match ? match[1] : epicName);

  await allure.story(testInfo.title);
}
