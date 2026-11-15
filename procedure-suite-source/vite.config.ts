import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({
  build: {
    lib:{entry:resolve(import.meta.dirname,'src/host/mountProcedureSuite.tsx'),name:'NdtProcedureSuite',formats:['es'],fileName:'ndt-procedure-suite'},
    rollupOptions:{output:{assetFileNames:'assets/[name][extname]'}},
    outDir:'dist',emptyOutDir:true
  }
});
