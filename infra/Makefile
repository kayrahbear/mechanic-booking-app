# Terraform workflow automation
.PHONY: help init plan apply destroy fmt validate clean

ENV ?= dev
TF_VAR_FILE = environments/$(ENV)/terraform.tfvars

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

init: ## Initialize Terraform
	terraform init -backend-config="bucket=tfstate-auto-mech-booking-$(ENV)" -backend-config="prefix=$(ENV)"

fmt: ## Format Terraform files
	terraform fmt -recursive

validate: ## Validate Terraform configuration
	terraform validate

plan: ## Plan Terraform changes
	terraform plan -var-file=$(TF_VAR_FILE) -out=tfplan

apply: ## Apply Terraform changes
	terraform apply tfplan

destroy: ## Destroy infrastructure (use with caution!)
	terraform destroy -var-file=$(TF_VAR_FILE)

clean: ## Clean temporary files
	rm -f tfplan
	rm -rf .terraform/

# Environment-specific targets
dev: ## Target dev environment
	$(MAKE) ENV=dev

prod: ## Target prod environment  
	$(MAKE) ENV=prod

# Convenience targets
dev-plan: ## Plan for dev environment
	$(MAKE) ENV=dev init plan

prod-plan: ## Plan for prod environment
	$(MAKE) ENV=prod init plan