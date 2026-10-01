// Ceres Wiki - generator for the CLI tables (ceres and ceresc).
//
//   node tools/gen/gen-cli.mjs
//
// The option lists live here, taken from `ceres --help` and `ceresc --help` (ceresc 0.1.0)
// and pinned to the commits in tools/versions.json. It writes MDX fragments under
// content/en/_gen/ that the CLI pages include with <Include>. Run it when the tools' options
// change and commit the fragments; CI regenerates and fails on drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const table = (headers, rows) => {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  return `${head}\n${sep}\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;
};

const CERES_COMMANDS = [
  ['`asm`', 'Assemble and link `.casm` sources'],
  ['`link`', 'Link `.cobj` objects and `.car` archives'],
  ['`ar`', 'Create a `.car` archive from objects'],
  ['`run`', 'Run a `.cres` (or assemble and run a `.casm`)'],
  ['`disasm`', 'Disassemble a `.cres` or `.casm`'],
  ['`profile`', 'Run counting instructions per line'],
  ['`debug`', 'Interactive debugger']
];

const CERES_MACHINE = [
  ['`--profile <name>`', 'micro, pocket, retro, arcade, polygon, standard, workstation, custom'],
  ['`--cpu-clock <hz>`', 'CPU clock (optional k/M/G); up to 400M'],
  ['`--gpu-clock <hz>`', 'GPU clock; up to 1G'],
  ['`--ram <bytes>`', 'RAM (optional K/M/G, a multiple of 4K); up to 2G'],
  ['`--vram <bytes>`', 'VRAM; up to 1G'],
  ['`--max-video <level>`', '`V0`–`V6`'],
  ['`--max-audio <level>`', '`A0`–`A4`'],
  ['`--max-resolution <w>x<h>`', '`1920x1080` is custom-only']
];

const CERES_RUN = [
  ['`--shell`', 'Go back to the shell whenever the program ends'],
  ['`--disk <image>`', 'A host file as the disk'],
  ['`--window` / `--headless`', 'Window or none (`CERES_HEADLESS=1` too)'],
  ['`--strict-mmio`', 'Fault on an undeclared device offset'],
  ['`--fullscreen`', 'Fill the screen (or F11)'],
  ['`--exit-on-halt`', 'Close the window as soon as the program ends'],
  ['`--frames <dir>`', 'A PNG of the screen at every `Present`'],
  ['`--refresh 50\\|60`', 'Frames a second'],
  ['`--transcript <file>`', 'Everything the program wrote to its terminal'],
  ['`--screen-log <file>`', 'The screen as text at every `Present`'],
  ['`--type <file>`', 'Type a file as the machine starts'],
  ['`--keys <file>`', "Press keys at instants of the machine's time"],
  ['`--gpu auto\\|software\\|hardware`', 'The GPU executor (only software so far)'],
  ['`--rtc <date>`', "Start the real-time clock at that UTC moment"],
  ['`--speed realtime\\|max\\|<f>x`', "Pace against the host's time"],
  ['`--record <file>` / `--replay <file>`', 'Sealed input in and out'],
  ['`--log <file>`', 'The debug log and the host diagnostics'],
  ['`--port <n>=<image>`', 'A stick on port n'],
  ['`--cart <n>=<file>`', 'A cartridge (read-only) on port n'],
  ['`--env <name>=<value>`', 'A program environment variable'],
  ['`--host-dir <dir>`', "Root of the host files the program may see"],
  ['`-- <argument>...`', 'Everything after goes to the program']
];

const CERESC_COMMON = [
  ['`-o <output>`', 'The `.casm` to write (one C input), or the linked program (several)'],
  ['`-I <dir>`', 'An `#include` search directory'],
  ['`-D <name>[=<val>]`', 'Predefine a macro (a bare name means 1)'],
  ['`-L <dir>`', 'A directory to search for `-l` libraries'],
  ['`-l <name>`', 'Link `lib<name>` (with `--run`)'],
  ['`--stdlib`', 'Compile against the installed `stdlib/`; with `--run`, link `libceres`'],
  ['`--decls <file>`', 'Declarations of a `.cobj`/`.car` (may be repeated)'],
  ['`--emit-decls <file>`', 'Write the declarations of what this build defines'],
  ['`-S` / `--run`', 'Stop at CASM / assemble, link and run (last one wins)'],
  ['`--clean` / `--clean-keep-casm`', 'After `--run`, remove the generated files'],
  ['`--ceres-path <path>`', 'Where Ceres is installed (dir or the `ceres` file)'],
  ['`--gc-sections`', 'Leave out unreachable functions (with `--run`)'],
  ['`--symtab`', 'Link a table of function names (with `--run`)'],
  ['`--emit-ast` / `--emit-ir` / `-E`', 'Print the annotated AST / the IR / the preprocessed source'],
  ['`-Werror`', 'Treat warnings as errors'],
  ['`-fshort-double`', '`double` is `float` (32 bits) instead of native binary64'],
  ['`--stats`', 'Report what the optimizer changed'],
  ['`--version` / `--help`', 'Print the version / the help']
];

const CERESC_OPTIM = [
  ['`-O0`', 'Every optimization off'],
  ['`-O1`', 'Everything except inlining (the default)'],
  ['`-O2`', 'Everything, inlining included'],
  ['`-O3`', 'Alias for `-O2`'],
  ['`-Os`', 'Size: no inlining, no jump tables'],
  ['`-Og`', 'Debugging: no inlining, no frame-slot reuse'],
  ['`-f<opt>` / `-fno-<opt>`', 'Turn one optimization on/off, over `-O` in argument order']
];

function write(name, text) {
  const dir = path.join(ROOT, 'content', 'en', '_gen');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), text, 'utf8');
  console.log(`wrote content/en/_gen/${name}`);
}

write('_ceres-commands.mdx', table(['Command', 'For what'], CERES_COMMANDS));
write('_ceres-machine.mdx', table(['Option', 'Takes'], CERES_MACHINE));
write('_ceres-run.mdx', table(['Option', 'What it does'], CERES_RUN));
write('_ceresc-options.mdx', table(['Option', 'What it does'], CERESC_COMMON));
write('_ceresc-optimization.mdx', table(['Level', 'What it does'], CERESC_OPTIM));

console.log('ok');
