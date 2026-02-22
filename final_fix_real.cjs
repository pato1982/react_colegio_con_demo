const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AsistenciaTab.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix malformed tags globally (just in case any left)
content = content.replace(/<\/div >/g, '</div>');

// Remove the extra closing divs at the end.
// We only need ONE closing div after the last popup.
// The last popup ends at L937.
// Then we have 3 divs at 939-941.
// We remove 940 and 941.

const lines = content.split('\n');
// Let's find the last occurrences of </div> before the return closure
let newLines = [];
let foundReturnEnd = false;
let divsToRemove = 2;

for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i];
    if (line.includes(');') && line.includes('}')) {
        // We found the end? No, usually it's separate lines
    }
}

// Better way: Reconstruct the end of the file
const lastPopupEndIndex = content.lastIndexOf(')}');
// The structure should be:
//      )}
//
//    </div>
//   );
// }
// 
// export default AsistenciaTab;

if (lastPopupEndIndex !== -1) {
    const startOfFile = content.substring(0, lastPopupEndIndex + 2);
    const endOfFile = `

    </div>
  );
}
// Fin componente AsistenciaTab

export default AsistenciaTab;
`;
    fs.writeFileSync(filePath, startOfFile + endOfFile, 'utf8');
    console.log('Successfully balanced and cleaned AsistenciaTab.jsx');
} else {
    console.log('Could not find end of popups.');
}
