# Code to docx

## Description

`code-to-docx` is a command-line tool that allows you to scan a specified directory for source code files and generate a `.docx` document containing the extracted code. It is particularly useful for generating documentation for projects, including code samples from the entire content of the project.

## Features

- Scan a specified directory and extract code from specific file types (e.g., `.vue`, `.js`, `.ts`).
- Generate a `.docx` document containing all the source code from the specified directory.

## Installation

First, you can install the tool globally using npm:

```sh
# Install globally from npm
npm install -g code-to-docx
```

After installing globally with npm, you can run the tool directly from the command line:

```sh
code-to-docx -s <source_directory> -t <file_types> -o <output_doc_path>
```

You can also use the alias `c2d` for convenience:

```sh
c2d -s <source_directory> -t <file_types> -o <output_doc_path>
```

Alternatively, you can clone the repository and install the required dependencies:

```sh
# Clone the repository
git clone <repository-url>

# Install dependencies (install the `commander`, `docx`, ...)
yarn install
```
Run the script using Yarn with the following command:

```sh
yarn start -s <source_directory> -t <file_types> -o <output_doc_path>
```

### Parameters

| Parameter                      | Description                                                                                                                                                      | Default                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `-s, --source <path>`          | **(Required)** Source directory to scan. This should be the directory containing your source code. It can be an absolute or relative path.                       |                                        |
| `-t, --type <file_types>`      | Comma-separated list of file types to scan, such as `.vue,.js`.                                                                                                   | `.vue,.js,.jsx,.ts,.tsx`               |
| `-o, --output <path>`          | Path to output the `.docx` file containing the extracted source code. This can be an absolute or relative path.                                                   | `output.docx`                          |
| `-l, --lines-per-page <number>`| Number of lines per page in the output `.docx` file.                                                                                                             | 50                                     |
| `-i, --ignored-dirs <directories>` | Comma-separated list of directory names to ignore during scanning. If you specify additional directories, they will be merged with the default list (duplicates will be removed). | `"node_modules,dist,.git,target,bin,build,__pycache__,venv,out,pkg,cargo-cache,gems"` |


**Notes**:

- Paths for `.docx` files must be writable by the user running the script.
- The `-t` parameter allows multiple file extensions to be specified as a comma-separated list.

### Example

```sh
code-to-docx -s /path/to/vue-project/src -t .vue,.js -o output.docx
```

or using the alias:

```sh
c2d -s /path/to/vue-project/src -t .vue,.js -o output.docx
```

This command will:

- Scan the `/path/to/vue-project/src` directory for `.vue` and `.js` files.
- Generate `output.docx` containing all lines of code from the specified files.

## Testing

We use Jest to test the functionality of the code extractor, including validation of the generated `.docx` file.

To run the tests, use the following command:

```sh
yarn test
```

This command will execute all test cases and provide output about the success or failure of each.

## Dependencies
- `docx` (third-party npm package): For creating `.docx` documents. Note that `docx` is not a Node.js native library, but an external package that needs to be installed separately.
- `commander` (npm package): For handling command-line arguments.

## License

This project is licensed under the MIT License.
