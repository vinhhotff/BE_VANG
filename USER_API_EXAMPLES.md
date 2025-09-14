# User API Examples

## Endpoint: `GET /api/v1/user`

### Query Parameters:
- `page`: Số trang (mặc định: 1)
- `limit`: Số item trên 1 trang (mặc định: 10)  
- `qs`: Query string filtering (format: key=value,key2=value2)
- `sortBy`: Trường để sắp xếp (mặc định: createdAt)
- `sortOrder`: Thứ tự sắp xếp asc/desc (mặc định: desc)

### Các key hỗ trợ trong `qs`:
- `search`: Tìm kiếm tổng hợp trong name và email
- `name`: Tìm kiếm theo tên cụ thể
- `email`: Tìm kiếm theo email cụ thể
- `role`: Tìm kiếm theo tên role (không phải ID)
- `phone`: Tìm kiếm theo số điện thoại

## Ví dụ sử dụng:

### 1. Basic pagination
```
GET http://localhost:8083/api/v1/user?page=1&limit=10
```

### 2. Filter by role with sorting
```
GET http://localhost:8083/api/v1/user?page=1&limit=10&qs=role=admin&sortBy=name&sortOrder=desc
```

### 3. Search with role filter
```
GET http://localhost:8083/api/v1/user?page=1&limit=5&qs=search=vinh,role=admin
```

### 4. Sort by creation date (newest first)
```
GET http://localhost:8083/api/v1/user?page=2&limit=20&sortBy=createdAt&sortOrder=asc
```

### 5. Multiple filters
```
GET http://localhost:8083/api/v1/user?qs=name=john,email=john@example.com
```

### 6. Search by phone
```
GET http://localhost:8083/api/v1/user?qs=phone=123456&sortBy=name&sortOrder=asc
```

### 7. General search with sorting
```
GET http://localhost:8083/api/v1/user?qs=search=admin&sortBy=email&sortOrder=asc
```

## Response Format:
```json
{
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "name": "John Doe", 
      "email": "john@example.com",
      "phone": "123456789",
      "address": "123 Main St",
      "role": {
        "_id": "64a1b2c3d4e5f6789012346",
        "name": "Admin",
        "permissions": ["user:create", "user:read", "user:update", "user:delete"]
      },
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "hasNext": true,
  "hasPrev": false
}
```

## Notes:
- Password và refreshToken được loại bỏ khỏi response để bảo mật
- Role được populate với tên và permissions thay vì chỉ ObjectId
- Tất cả text search đều case-insensitive và hỗ trợ partial matching
- Role filtering hoạt động bằng tên role, không phải ObjectId
