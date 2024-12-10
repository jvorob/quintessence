#Given an input file, processes the following directives:

#   "#QUINE_START" / "#QUINE_END": delimits area to be grabbed
#   "#QUINE_INSERT": marks place to insert the quine

import sys

# escapes a single line for being put into a js `` string
# Turns existing backslashes into a temp marker
# escapes any ` or $
# turns markers back into \\
def q_escape(line):
    MARKER = "XXXX42";
    s = line
    s = s.replace("\\", MARKER); # backslashes to markers
    s = s.replace("`", "\\`");   # ` to \`
    s = s.replace("$", "\\$");   # $ to \$
    s = s.replace(MARKER, "\\\\");   # \ to \\
    return s;

def q_compile(input_lines):

    quine_lines = []
    quining = False

    # Gather portion of file to be quined
    for line in input_lines:
        if(line.startswith("#QUINE_START")):
            assert not quining
            quining = True
            continue
        elif(line.startswith("#QUINE_END")):
            assert quining
            quining = False
            continue
        elif(line.startswith("#QUINE_INSERT")):
            assert not quining # We shouldn't have recursive quine definitions?
            continue # don't include this in the quined lines

        if quining:
            quine_lines.append(q_escape(line))

    # Now: go through again and print it out, interpolating quined body
    for line in input_lines:
        if(line.startswith("#QUINE_START")):
            continue
        elif(line.startswith("#QUINE_END")):
            continue

        elif(line.startswith("#QUINE_INSERT")): # interpolate all quine body
            for q in quine_lines:
                print(q, end="")
        else: #normal: just echo
            print(line, end="")



if __name__ == "__main__":
    # Check if a filename argument is provided
    if len(sys.argv) < 2:
        print("Error: No filename provided.")
        print("Usage: python q_compile.py <filename>")
        sys.exit(1)

    filename = sys.argv[1]

    try:
        # Attempt to open and read the file
        with open(filename, 'r') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"Error: The file '{filename}' does not exist.")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

    q_compile(lines)
