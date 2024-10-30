# code-to-docx

<!-- [![Build Status](https://img.shields.io/github/actions/workflow/status/xllily/code-to-docx/ci.yml?branch=main)](https://github.com/xllily/code-to-docx/actions) -->
<!-- [![Coverage](https://img.shields.io/codecov/c/github/xllily/code-to-docx/main)](https://codecov.io/gh/xllily/code-to-docx) -->
[![Downloads](https://img.shields.io/npm/dw/code-to-docx)](https://www.npmjs.com/package/code-to-docx)
[![NPM Version](https://img.shields.io/npm/v/code-to-docx)](https://www.npmjs.com/package/code-to-docx)
[![License](https://img.shields.io/npm/l/code-to-docx)](https://github.com/xllily/code-to-docx/blob/main/LICENSE)
<!-- [![Chat](https://img.shields.io/discord/yourdiscordid)](https://discord.gg/yourdiscordlink) -->

## Overview

`code-to-docx` is a powerful command-line tool designed to scan a specified directory for source code files and generate a `.docx` document containing the extracted code. With options for customizable output, this tool is ideal for creating documentation that includes complete, formatted code samples. You can specify the number of lines per page in the generated document and easily exclude directories as needed, making it a flexible solution for project documentation.

### Key Features
- **Directory Scanning**: Automatically scans all files in a specified directory.
- **Code Extraction**: Extracts code from various file formats and languages.
- **.docx Generation**: Outputs code in a structured, styled Word document.
- **Page Customization**: Allows you to specify the number of lines per page in the generated document for better readability and control over document length.
- **Directory Ignoring**: Provides options to specify directories to ignore during scanning, giving you flexibility in excluding certain folders from the final output.
- **Ideal for Documentation**: Simplifies the process of generating reference materials.

## Overview

`code-to-docx` is a powerful command-line tool designed to scan a specified directory for source code files and generate a `.docx` document containing the extracted code. With options for customizable output, this tool is ideal for creating documentation that includes complete, formatted code samples. You can specify the number of lines per page in the generated document and easily exclude files or directories as needed, making it a flexible solution for project documentation.

### Key Features
- **Directory Scanning**: Automatically scans all files in a specified directory.
- **Code Extraction**: Extracts code from various file formats and languages.
- **`.docx` Generation**: Outputs code in a structured, styled Word document.
- **Page Customization**: Allows you to specify the number of lines per page in the generated document for better readability and control over document length.
- **Directory Ignoring**: : Provides options to specify directories to ignore during scanning, giving you flexibility in excluding certain folders from the final output.
- **Ideal for Documentation**: Simplifies the process of generating reference materials.


## Installation

First, you can install the tool globally using npm:

```sh
# Install globally from npm
npm install -g code-to-docx
```

After installing globally with npm, you can run the tool directly from the command line:

```sh
code-to-docx --source <source_directory> --type <file_types> --output <output_doc_path>  --ignored-dirs <ignore_dirs> --lines-per-page <lines_per_page>
```

You can also use the alias `c2d` for convenience:

```sh
c2d -s <source_directory> -t <file_types> -o <output_doc_path> -i <ignore_dirs> -l <lines_per_page>
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
yarn start -s <source_directory> -t <file_types> -o <output_doc_path> -i <ignore_dirs> -l <lines_per_page>
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
