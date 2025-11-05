#!/bin/bash

# Barber App Backend Directory Setup Script

# Create the root project directory
mkdir -p barber-app-backend
cd barber-app-backend

# Create main source directory
mkdir -p src

# Create config directory and files
mkdir -p src/config
touch src/config/db.js
touch src/config/s3.js
touch src/config/app.js

# Create models directory and files
mkdir -p src/models
touch src/models/User.js
touch src/models/Role.js

# Create API directory structure
mkdir -p src/api/admin/controllers
mkdir -p src/api/auth/controllers
touch src/api/admin/routes.js
touch src/api/auth/routes.js
touch src/api/index.js

# Create controller files
touch src/api/admin/controllers/userController.js
touch src/api/admin/controllers/roleController.js
touch src/api/auth/controllers/authController.js

# Create services directory and files
mkdir -p src/services
touch src/services/userService.js
touch src/services/roleService.js
touch src/services/authService.js

# Create middlewares directory and files
mkdir -p src/middlewares
touch src/middlewares/auth.js
touch src/middlewares/rbac.js
touch src/middlewares/errorHandler.js

# Create utils directory and files
mkdir -p src/utils
touch src/utils/constants.js
touch src/utils/validators.js
touch src/utils/helpers.js
touch src/utils/logger.js

# Create root project files
touch .env.example
touch .gitignore
touch package.json
touch server.js
touch README.md

# Prepare for future modules - models
touch src/models/Customer.js
touch src/models/ShopOwner.js
touch src/models/Barber.js
touch src/models/Shop.js
touch src/models/Service.js
touch src/models/Booking.js
touch src/models/Payment.js
touch src/models/Notification.js

# Prepare for future modules - API
mkdir -p src/api/shops/controllers
mkdir -p src/api/barbers/controllers
mkdir -p src/api/services/controllers
mkdir -p src/api/bookings/controllers
mkdir -p src/api/payments/controllers
mkdir -p src/api/customers/controllers
touch src/api/shops/routes.js
touch src/api/barbers/routes.js
touch src/api/services/routes.js
touch src/api/bookings/routes.js
touch src/api/payments/routes.js
touch src/api/customers/routes.js

# Prepare for future modules - services
touch src/services/shopService.js
touch src/services/barberService.js
touch src/services/serviceService.js
touch src/services/bookingService.js
touch src/services/paymentService.js
touch src/services/customerService.js
touch src/services/notificationService.js
touch src/services/fileUploadService.js

echo "Project directory structure created successfully!"
echo "Next steps:"
echo "1. Run 'npm init -y' to initialize package.json"
echo "2. Run 'npm install' to install dependencies"
echo "3. Start coding!"

# Display the directory structure
find . -type d | sort