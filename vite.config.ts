import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

// Get the directory name using __dirname (CommonJS compatible)
const __dirname = path.resolve();

// Conditionally load Replit plugins only in development
const loadReplitPlugins = async () => {
  // Check multiple test indicators
  const isTest = process.env.NODE_ENV === "test" || 
                 process.env.PLAYWRIGHT_TEST === "true" ||
                 process.env.NODE_ENV === "production" || 
                 !process.env.REPL_ID ||
                 process.argv.includes('--mode=test');
                 
  if (isTest) {
    console.log(`🧪 Skipping Replit plugins - NODE_ENV: ${process.env.NODE_ENV}, PLAYWRIGHT_TEST: ${process.env.PLAYWRIGHT_TEST}, REPL_ID: ${!!process.env.REPL_ID}`);
    return [];
  }
  
  const plugins: PluginOption[] = [];
  
  try {
    // Load runtime error overlay (usually stable) - DISABLED during testing
    console.log("⚠️ Runtime error overlay disabled for testing compatibility");
    // const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default());
    // plugins.push(runtimeErrorOverlay);
  } catch (error) {
    console.warn("Could not load runtime error modal plugin:", (error as Error).message);
  }
  
  try {
    // Load cartographer with graceful fallback
    // Temporarily disabled due to traverse function compatibility issues with latest versions
    const cartographer = await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer());
    plugins.push(cartographer);
    // console.log("✅ Cartographer plugin loaded successfully");
  } catch (error) {
    console.warn("⚠️  Cartographer plugin disabled due to compatibility issues:", (error as Error).message);
  }
  
  return plugins;
};

// Plugin to copy FontAwesome fonts
const copyFontAwesomeFonts = (): PluginOption => {
  return {
    name: 'copy-fontawesome-fonts',
    generateBundle() {
      const fontSrcDir = path.resolve(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts');
      const fontDestDir = path.resolve(__dirname, 'dist/public/webfonts');
      
      // Create webfonts directory if it doesn't exist
      if (!existsSync(fontDestDir)) {
        mkdirSync(fontDestDir, { recursive: true });
      }
      
      // List of font files to copy
      const fontFiles = [
        'fa-brands-400.woff2',
        'fa-brands-400.ttf',
        'fa-regular-400.woff2', 
        'fa-regular-400.ttf',
        'fa-solid-900.woff2',
        'fa-solid-900.ttf',
        'fa-v4compatibility.woff2',
        'fa-v4compatibility.ttf'
      ];
      
      // Copy each font file
      fontFiles.forEach(fontFile => {
        const srcPath = path.join(fontSrcDir, fontFile);
        const destPath = path.join(fontDestDir, fontFile);
        
        if (existsSync(srcPath)) {
          try {
            copyFileSync(srcPath, destPath);
            console.log(`✅ Copied FontAwesome font: ${fontFile}`);
          } catch (error) {
            console.warn(`⚠️  Failed to copy ${fontFile}:`, error);
          }
        } else {
          console.warn(`⚠️  FontAwesome font not found: ${fontFile}`);
        }
      });
    }
  };
};

export default defineConfig(async () => {
  const replitPlugins = await loadReplitPlugins();
  
  return {
    plugins: [
      react(),
      ...replitPlugins,
      copyFontAwesomeFonts(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
        // Ensure FontAwesome webfonts are properly resolved
        "@fortawesome/fontawesome-free/webfonts": path.resolve(__dirname, "node_modules/@fortawesome/fontawesome-free/webfonts"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and related libraries
            'react-vendor': ['react', 'react-dom'],
            // UI components chunk
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip'
            ],
            // Data and query chunk
            'data-vendor': [
              '@tanstack/react-query',
              'drizzle-orm',
              'zod'
            ],
            // Chart and visualization chunk
            'charts-vendor': ['recharts'],
            // Icons chunk
            'icons-vendor': ['lucide-react'],
            // Form handling chunk
            'forms-vendor': [
              'react-hook-form',
              '@hookform/resolvers'
            ]
          },
          assetFileNames: (assetInfo) => {
            const extname = path.extname(assetInfo.name || '');
            
            // Organize font files properly  
            if (assetInfo.name && /\.(woff2?|ttf|eot|otf)$/.test(assetInfo.name)) {
              return 'webfonts/[name][extname]';
            }
            
            // Handle specific FontAwesome font files
            if (assetInfo.name && assetInfo.name.includes('fa-')) {
              return 'webfonts/[name][extname]';
            }
            
            // Default behavior for other assets
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Ensure proper asset handling for fonts
      assetsInlineLimit: 0, // Don't inline any assets, serve them as separate files
      // Include FontAwesome fonts in the build
      assetsInclude: ['**/*.woff2', '**/*.woff', '**/*.ttf', '**/*.eot'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test-setup.ts',
        ],
      },
    },
  };
});
