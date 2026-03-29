import { Header } from "@/components/Header";
import { CreateEscrowForm } from "@/components/CreateEscrowForm";
import { motion } from "framer-motion";

export default function CreateEscrowPage() {
  return (
    <div className="min-h-screen bg-background grid-bg">
      <Header />
      <main className="container py-8 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CreateEscrowForm />
        </motion.div>
      </main>
    </div>
  );
}
