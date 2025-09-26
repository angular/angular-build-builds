/**
 * Unit testing options for Angular applications.
 */
export type Schema = {
    /**
     * Specifies the browsers to use for test execution. When not specified, tests are run in a
     * Node.js environment using jsdom. For both Vitest and Karma, browser names ending with
     * 'Headless' (e.g., 'ChromeHeadless') will enable headless mode.
     */
    browsers?: string[];
    /**
     * Specifies the build target to use for the unit test build in the format
     * `project:target[:configuration]`. You can also pass a comma-separated list of
     * configurations. Example: `project:target:production,staging`.
     */
    buildTarget: string;
    /**
     * Enables code coverage reporting for tests.
     */
    codeCoverage?: boolean;
    /**
     * Specifies glob patterns of files to exclude from the code coverage report.
     */
    codeCoverageExclude?: string[];
    /**
     * Specifies the reporters to use for code coverage results. Each reporter can be a string
     * representing its name, or a tuple containing the name and an options object. Built-in
     * reporters include 'html', 'lcov', 'lcovonly', 'text', 'text-summary', 'cobertura',
     * 'json', and 'json-summary'.
     */
    codeCoverageReporters?: SchemaCodeCoverageReporter[];
    /**
     * Enables debugging mode for tests, allowing the use of the Node Inspector.
     */
    debug?: boolean;
    /**
     * Dumps build output files to the `.angular/cache` directory for debugging purposes.
     */
    dumpVirtualFiles?: boolean;
    /**
     * Specifies glob patterns of files to exclude from testing, relative to the project root.
     */
    exclude?: string[];
    /**
     * Specifies a regular expression pattern to match against test suite and test names. Only
     * tests with a name matching the pattern will be executed. For example, `^App` will run
     * only tests in suites beginning with 'App'.
     */
    filter?: string;
    /**
     * Specifies glob patterns of files to include for testing, relative to the project root.
     * This option also has special handling for directory paths (includes all `.spec.ts` files
     * within) and file paths (includes the corresponding `.spec` file if one exists).
     */
    include?: string[];
    /**
     * Lists all discovered test files and exits the process without building or executing the
     * tests.
     */
    listTests?: boolean;
    /**
     * Specifies a file path for the test report, applying only to the first reporter. To
     * configure output files for multiple reporters, use the tuple format `['reporter-name', {
     * outputFile: '...' }]` within the `reporters` option. When not provided, output is written
     * to the console.
     */
    outputFile?: string;
    /**
     * Shows build progress information in the console. Defaults to the `progress` setting of
     * the specified `buildTarget`.
     */
    progress?: boolean;
    /**
     * Specifies the path to a TypeScript file that provides an array of Angular providers for
     * the test environment. The file must contain a default export of the provider array.
     */
    providersFile?: string;
    /**
     * Specifies the reporters to use during test execution. Each reporter can be a string
     * representing its name, or a tuple containing the name and an options object. Built-in
     * reporters include 'default', 'verbose', 'dots', 'json', 'junit', 'tap', 'tap-flat', and
     * 'html'. You can also provide a path to a custom reporter.
     */
    reporters?: SchemaReporter[];
    /**
     * Specifies the test runner to use for test execution.
     */
    runner: Runner;
    /**
     * A list of paths to global setup files that are executed before the test files. The
     * application's polyfills and the Angular TestBed are always initialized before these files.
     */
    setupFiles?: string[];
    /**
     * The path to the TypeScript configuration file, relative to the workspace root.
     */
    tsConfig: string;
    /**
     * Enables watch mode, which re-runs tests when source files change. Defaults to `true` in
     * TTY environments and `false` otherwise.
     */
    watch?: boolean;
};
export type SchemaCodeCoverageReporter = CodeCoverageReporterCodeCoverageReporterUnion[] | CodeCoverageReporterEnum;
export type CodeCoverageReporterCodeCoverageReporterUnion = CodeCoverageReporterEnum | {
    [key: string]: any;
};
export declare enum CodeCoverageReporterEnum {
    Cobertura = "cobertura",
    Html = "html",
    Json = "json",
    JsonSummary = "json-summary",
    Lcov = "lcov",
    Lcovonly = "lcovonly",
    Text = "text",
    TextSummary = "text-summary"
}
export type SchemaReporter = ReporterReporter[] | string;
export type ReporterReporter = {
    [key: string]: any;
} | string;
/**
 * Specifies the test runner to use for test execution.
 */
export declare enum Runner {
    Karma = "karma",
    Vitest = "vitest"
}
