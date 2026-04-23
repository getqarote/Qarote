# 🚫 Règles de Développement Qarote

## ⚠️ RÈGLES CRITIQUES

### 1. **JAMAIS de push direct sur `main`**
```bash
❌ git push origin main           # INTERDIT
✅ git push origin feat/my-branch # CORRECT
```

**Workflow correct :**
```bash
# 1. Créer une branche de feature
git checkout -b feat/my-feature

# 2. Faire les modifications et commits
git add .
git commit -m "feat: description"

# 3. Push sur la branche de feature
git push origin feat/my-feature

# 4. Créer une Pull Request
gh pr create --title "..." --body "..."
```

### 2. **Toujours passer par des Pull Requests**
- ✅ Permet la review du code
- ✅ Permet les tests automatisés (CI)
- ✅ Permet la discussion et amélioration
- ✅ Maintient l'historique propre
- ✅ Évite les conflits et problèmes

### 3. **Nomenclature des branches**
```bash
feat/feature-name          # Nouvelles fonctionnalités
fix/bug-description        # Corrections de bugs  
chore/maintenance-task     # Tâches de maintenance
docs/documentation-update  # Mises à jour documentation
refactor/code-improvement  # Refactoring
```

### 4. **Protection de la branche `main`**
- La branche `main` doit être protégée
- Require PR reviews avant merge
- Require status checks (CI) to pass
- No direct pushes allowed

## 📋 Checklist avant Push

- [ ] Je suis sur une branche de feature (pas `main`)
- [ ] Mon commit message suit les conventional commits
- [ ] J'ai testé mes modifications localement
- [ ] Je pousse vers ma branche de feature
- [ ] Je vais créer une PR pour review

## 🚨 Si Erreur Commise

Si push accidentel sur `main` :

```bash
# 1. Créer une branche de sauvegarde du commit
git branch backup-commit

# 2. Reset main au commit précédent  
git reset --hard HEAD~1

# 3. Force push (DANGEREUX - seulement si pas encore partagé)
git push origin main --force-with-lease

# 4. Créer PR depuis backup-commit
git checkout backup-commit
git push origin backup-commit
gh pr create --title "Fix: restore accidentally pushed changes"
```

## 💡 Bonnes Pratiques

- **Feature branches** pour chaque modification
- **Squash commits** lors du merge si nécessaire
- **Delete branches** après merge
- **Review** toujours le code avant merge
- **CI/CD** doit passer avant merge

---

**🎯 Règle d'or : `main` est sacré, on n'y touche que via PR !**